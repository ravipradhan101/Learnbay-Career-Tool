import { getCurrentUser } from '@/lib/auth'
import { transaction } from '@/lib/db'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { mergeAnswers, sanitizeAnswers } from '@/lib/validation'
import type { Answers } from '@/lib/questions'

/** Adds answers to tool questions. Existing answers are never overwritten (profiles are locked). */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`profile:user:${user.id}`, 30, 3600))) return jsonError(429, 'Too many changes. Please try again later.')
  const body = await readJson<{ answers?: unknown }>(request, 8_000)
  const incoming = sanitizeAnswers(body?.answers)
  const merged = await transaction(async (db) => {
    const row = await db.query<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1 FOR UPDATE`, [user.id])
    if (!row.rows[0]) return null
    const next = mergeAnswers(row.rows[0].answers, incoming)
    await db.query(`UPDATE assessments SET answers = $2, updated_at = now() WHERE user_id = $1`, [user.id, JSON.stringify(next)])
    return next
  })
  if (!merged) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start' })
  return jsonOk({ answers: merged })
}
