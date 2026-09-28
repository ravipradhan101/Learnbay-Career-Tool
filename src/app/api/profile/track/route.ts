import { getCurrentUser } from '@/lib/auth'
import { transaction } from '@/lib/db'
import { TRACKS, TRACK_TARGET, type Answers } from '@/lib/questions'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'

/**
 * Moves the learner to another track after they approved the counsellor's suggestion in the chat.
 * Profiles are otherwise locked; this is the one answer the learner can change themselves. Reports built for the
 * old track go back to "not built" so they are rebuilt for the new one (the old data is overwritten on rebuild).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`track:user:${user.id}`, 5, 24 * 3600))) return jsonError(429, 'You’ve changed tracks a few times today. A mentor can help you decide on a free call.')
  const body = await readJson<{ interest?: unknown }>(request, 1_000)
  const target = TRACKS.find((t) => t.interest === body?.interest)
  if (!target) return jsonError(400, 'Unknown track.')

  const answers = await transaction(async (db) => {
    const row = await db.query<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1 FOR UPDATE`, [user.id])
    if (!row.rows[0]) return null
    const prev = row.rows[0].answers
    if (prev.interest === target.interest) return prev
    const next: Answers = { ...prev, interest: target.interest, targetRole: TRACK_TARGET[target.interest] }
    await db.query(`UPDATE assessments SET answers = $2, updated_at = now() WHERE user_id = $1`, [user.id, JSON.stringify(next)])
    await db.query(`UPDATE tool_results SET status = 'pending', attempts = 0, error = NULL, updated_at = now() WHERE user_id = $1 AND status IN ('ready', 'failed')`, [user.id])
    return next
  })
  if (!answers) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start' })
  return jsonOk({ answers })
}
