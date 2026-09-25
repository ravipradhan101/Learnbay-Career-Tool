import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { sendReportReadyEmail } from '@/lib/mailer'
import { generateReport } from '@/lib/report'
import { isSameOrigin, jsonError, jsonOk } from '@/lib/security'
import { firstName } from '@/lib/validation'
import type { Answers } from '@/lib/questions'

export const maxDuration = 180

const MAX_ATTEMPTS = 4

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')

  // Claim the report for generation atomically so double clicks or two tabs never spend twice.
  const claimed = await queryOne<{ id: string; answers: Answers }>(
    `UPDATE reports r SET status = 'generating', attempts = r.attempts + 1, generating_started_at = now(), error = NULL, updated_at = now()
       FROM assessments a
      WHERE r.user_id = $1 AND a.user_id = r.user_id
        AND r.attempts < $2
        AND (r.status IN ('pending', 'failed') OR (r.status = 'generating' AND r.generating_started_at < now() - interval '4 minutes'))
      RETURNING r.id, a.answers`,
    [user.id, MAX_ATTEMPTS],
  )

  if (!claimed) {
    const current = await queryOne<{ status: string; attempts: number }>(`SELECT status, attempts FROM reports WHERE user_id = $1`, [user.id])
    if (!current) return jsonError(404, 'Please complete the questions first.', { redirect: '/start' })
    if (current.status === 'ready') return jsonOk({ status: 'ready' })
    if (current.status === 'generating') return jsonOk({ status: 'generating' })
    return jsonError(429, 'We could not build your report after several tries. Please talk to a counselor and we will help you right away.', { status: 'failed', exhausted: true })
  }

  try {
    const data = await generateReport(claimed.answers, firstName(user.name))
    await query(`UPDATE reports SET status = 'ready', data = $2, error = NULL, updated_at = now() WHERE id = $1`, [claimed.id, JSON.stringify(data)])
  } catch (err) {
    const message = (err as Error).message
    console.error('[report] generation failed', message)
    await query(`UPDATE reports SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`, [claimed.id, message.slice(0, 500)])
    return jsonError(502, 'We could not build your report just now. Please try again.', { status: 'failed' })
  }

  const sent = await queryOne(`UPDATE reports SET ready_email_sent_at = now() WHERE id = $1 AND ready_email_sent_at IS NULL RETURNING id`, [claimed.id])
  if (sent) {
    sendReportReadyEmail(user.email, firstName(user.name)).catch((e) => console.error('[report] ready email failed', (e as Error).message))
  }
  return jsonOk({ status: 'ready' })
}
