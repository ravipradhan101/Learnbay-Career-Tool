import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { counsellorOf } from '@/lib/counsellor-server'
import { ratingOf, saveReview } from '@/lib/reviews'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const stars = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null }

/** Lumi's feedback pop-up: 1-5 stars for the counsellor, optionally for the eligibility test, and a suggestion. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`review:${user.id}`, 10, 24 * 3600))) return jsonError(429, 'Thanks, we already have your rating.')
  const body = await readJson<{ rating?: unknown; testRating?: unknown; comment?: unknown; suggestion?: unknown; threadId?: unknown }>(request, 6_000)
  const rating = stars(body?.rating)
  if (!rating) return jsonError(400, 'Please pick 1 to 5 stars for your counsellor.')
  // Only the learner's own chat can be referenced.
  const threadId = typeof body?.threadId === 'string' && UUID_RE.test(body.threadId)
    ? (await queryOne<{ id: string }>(`SELECT id FROM chat_threads WHERE id = $1 AND user_id = $2`, [body.threadId, user.id]))?.id ?? null
    : null
  const counsellor = await counsellorOf(user.id)
  // The eligibility test is only rated by people who have finished it.
  const testRating = stars(body?.testRating)
  const tookTest = testRating
    ? Boolean(await queryOne(`SELECT 1 FROM eligibility_tests WHERE user_id = $1 AND status = 'completed' LIMIT 1`, [user.id]))
    : false
  await saveReview({
    userId: user.id, threadId, counsellor, rating,
    testRating: tookTest ? testRating : null,
    comment: cleanText(body?.comment, 300) || null,
    suggestion: cleanText(body?.suggestion, 1000) || null,
  })
  return jsonOk({ rating: await ratingOf(counsellor) })
}
