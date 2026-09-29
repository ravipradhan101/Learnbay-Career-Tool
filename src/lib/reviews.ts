import { query, queryOne } from './db'

export type Rating = { avg: number; count: number }

/** A counsellor's average rating from real learner reviews (null until someone has rated them). */
export async function ratingOf(counsellor: string): Promise<Rating | null> {
  const row = await queryOne<{ avg: string | null; count: number }>(
    `SELECT avg(rating)::numeric(3,2)::text AS avg, count(*)::int AS count FROM counsellor_reviews WHERE counsellor = $1`,
    [counsellor],
  )
  return row && row.count > 0 && row.avg ? { avg: Number(row.avg), count: row.count } : null
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
