import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { startTest } from '@/lib/eligibility'
import { track } from '@/lib/server-track'
import type { Answers } from '@/lib/questions'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { sanitizeAnswers } from '@/lib/validation'

export const maxDuration = 60

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`elig:start:${user.id}`, 10, 3600))) return jsonError(429, 'Please wait a little and try again.')
  const body = await readJson<{ answers?: unknown }>(request, 2_000)
  const incoming = sanitizeAnswers(body?.answers)
  // Only the pre-test question is accepted here; the rest of the profile stays locked.
  const extra: Answers = { eduLevel: incoming.eduLevel }
  // One round trip: existing answers win (the profile is locked); the new ones only fill gaps.
  const filled = Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined))
  const row = await queryOne<{ answers: Answers }>(
    `UPDATE assessments SET answers = $2::jsonb || answers, updated_at = now() WHERE user_id = $1 RETURNING answers`,
    [user.id, JSON.stringify(filled)],
  )
  const answers = row?.answers ?? null
  if (!answers?.interest) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start' })
  if (!answers.eduLevel) return jsonError(400, 'Please tell us your highest qualification before starting.')
  const result = await startTest(user.id, answers)
  if (!result.state) return jsonError(400, result.error ?? 'Could not start the test.')
  track(user.id, 'eligibility_started')
  return jsonOk({ state: result.state })
}
