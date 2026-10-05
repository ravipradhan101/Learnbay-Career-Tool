import { query, queryOne } from './db'

export type Rating = { avg: number; count: number }

/**
 * DEMO DATA for the stakeholder prototype: starting ratings per counsellor, blended with real learner reviews.
 * Switch off with DEMO_RATINGS=false before real learners use the app (Admin → Reviews shows a banner while it's on).
 */
export const DEMO_RATINGS: Record<string, Rating> = {
  tanya: { avg: 4.82, count: 3126 }, siya: { avg: 4.76, count: 2481 }, mangesh: { avg: 4.68, count: 1893 }, elanor: { avg: 4.91, count: 4637 },
  kshitij: { avg: 4.57, count: 958 }, riya: { avg: 4.87, count: 3712 }, imran: { avg: 4.73, count: 2214 },
}
export const demoRatingsOn = () => process.env.DEMO_RATINGS !== 'false'

/** Stars are shown once a counsellor has this many ratings (one early rating never decides what everyone sees). */
export const MIN_RATINGS_SHOWN = 10

/** A counsellor's rating: real reviews, blended with the demo starting ratings while demo data is on. */
export async function ratingOf(counsellor: string): Promise<Rating | null> {
  return (await ratingsOf([counsellor]))[counsellor] ?? null
}

/** Ratings for several counsellors at once (an average over every rating, so each new rating moves it a little). */
export async function ratingsOf(ids: string[]): Promise<Record<string, Rating>> {
  const rows = await query<{ counsellor: string; total: number; count: number }>(
    `SELECT counsellor, sum(rating)::float AS total, count(*)::int AS count FROM counsellor_reviews WHERE counsellor = ANY($1) GROUP BY counsellor`,
    [ids],
  )
  const out: Record<string, Rating> = {}
  for (const id of ids) {
    const real = rows.find((r) => r.counsellor === id)
    const demo = demoRatingsOn() ? DEMO_RATINGS[id] : undefined
    const count = (real?.count ?? 0) + (demo?.count ?? 0)
    if (!count) continue
    const total = (real?.total ?? 0) + (demo ? demo.avg * demo.count : 0)
    out[id] = { avg: Math.round((total / count) * 100) / 100, count }
  }
  return out
}

export type ReviewInput = {
  userId: string; threadId: string | null; counsellor: string
  rating: number; testRating: number | null; comment: string | null; suggestion: string | null
}

/** One review per chat: rating again in the same chat updates it. */
export async function saveReview(r: ReviewInput) {
  const values = [r.userId, r.threadId, r.counsellor, r.rating, r.comment, r.testRating, r.suggestion]
  if (r.threadId) {
    await query(
      `INSERT INTO counsellor_reviews (user_id, thread_id, counsellor, rating, comment, test_rating, suggestion) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, thread_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, counsellor = EXCLUDED.counsellor,
         test_rating = EXCLUDED.test_rating, suggestion = EXCLUDED.suggestion, updated_at = now()`,
      values,
    )
  } else {
    await query(`INSERT INTO counsellor_reviews (user_id, thread_id, counsellor, rating, comment, test_rating, suggestion) VALUES ($1, $2, $3, $4, $5, $6, $7)`, values)
  }
}

/** For the admin panel: ratings per counsellor, the eligibility test's rating, and the latest reviews with suggestions. */
export async function reviewReport(since: Date) {
  const [byCounsellor, test, latest] = await Promise.all([
    query<{ counsellor: string; avg: string; count: number; low: number }>(
      `SELECT counsellor, avg(rating)::numeric(3,2)::text AS avg, count(*)::int AS count, count(*) FILTER (WHERE rating <= 2)::int AS low
         FROM counsellor_reviews WHERE updated_at >= $1 GROUP BY counsellor ORDER BY count(*) DESC`,
      [since],
    ),
    queryOne<{ avg: string | null; count: number }>(
      `SELECT avg(test_rating)::numeric(3,2)::text AS avg, count(test_rating)::int AS count FROM counsellor_reviews WHERE updated_at >= $1`,
      [since],
    ),
    query<{ id: string; user_id: string; name: string | null; email: string; counsellor: string; rating: number; test_rating: number | null; comment: string | null; suggestion: string | null; updated_at: Date }>(
      `SELECT r.id, r.user_id, u.name, u.email, r.counsellor, r.rating, r.test_rating, r.comment, r.suggestion, r.updated_at
         FROM counsellor_reviews r JOIN users u ON u.id = r.user_id
        WHERE r.updated_at >= $1 ORDER BY r.updated_at DESC LIMIT 200`,
      [since],
    ),
  ])
  return { byCounsellor, test, latest }
}
