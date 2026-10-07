import { getCurrentUser } from '@/lib/auth'
import { transaction } from '@/lib/db'
import { PROGRAMS } from '@/config/programs'
import { TRACKS, trackOf, type Answers } from '@/lib/questions'
import { defaultTargetRole } from '@/lib/segments'
import { skillFamily } from '@/lib/skills'
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
  if (!(await rateLimit(`track:user:${user.id}`, 5, 24 * 3600))) return jsonError(429, 'You’ve changed tracks a few times today. A Senior Counsellor can help you decide on a free call.')
  const body = await readJson<{ interest?: unknown; program?: unknown }>(request, 1_000)
  // A program the learner approved (e.g. Applied AI Practitioner instead of GenAI & Agentic AI), or a whole track.
  const program = PROGRAMS.find((p) => p.id === body?.program)
  // Data science and analytics programs sit in the AI & Data Science track (trackOf).
  const target = program ? TRACKS.find((t) => program.interests.some((i) => trackOf(i)?.interest === t.interest)) : TRACKS.find((t) => t.interest === body?.interest)
  if (!target && !program) return jsonError(400, 'Unknown track.')

  const answers = await transaction(async (db) => {
    const row = await db.query<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1 FOR UPDATE`, [user.id])
    if (!row.rows[0]) return null
    const prev = row.rows[0].answers
    const interest = target?.interest ?? prev.interest
    if (!program && prev.interest === interest) return prev
    const next: Answers = { ...prev, interest, program: program?.id }
    if (!program) delete next.program
    // A new track or program: the target follows from it (e.g. "AI-powered Marketer" on the Applied AI Practitioner Program).
    if (interest !== prev.interest || program) next.targetRole = defaultTargetRole({ ...next, targetRole: undefined }) ?? prev.targetRole
    await db.query(`UPDATE assessments SET answers = $2, updated_at = now() WHERE user_id = $1`, [user.id, JSON.stringify(next)])
    // Reports built for another track or kind of program are rebuilt for the new one.
    if (interest !== prev.interest || skillFamily(next) !== skillFamily(prev)) {
      await db.query(`UPDATE tool_results SET status = 'pending', attempts = 0, error = NULL, updated_at = now() WHERE user_id = $1 AND status IN ('ready', 'failed')`, [user.id])
    }
    return next
  })
  if (!answers) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start' })
  return jsonOk({ answers })
}
