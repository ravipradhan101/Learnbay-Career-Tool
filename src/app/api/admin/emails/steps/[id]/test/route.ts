import { queryOne } from '@/lib/db'
import { adminGuard, isUuid } from '@/lib/email/admin'
import { sendTestEmail, type StepRow } from '@/lib/email/flows'
import { SAMPLE_VARS } from '@/lib/email/render'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

/** Sends this email, filled with sample learner details, to the signed-in admin's own address. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  if (!(await rateLimit(`emailtest:${admin.id}`, 20, 3600))) return jsonError(429, 'Too many test emails. Try again later.')
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Email not found.')
  const step = await queryOne<StepRow & { flow_name: string }>(
    `SELECT s.*, f.name AS flow_name FROM email_steps s JOIN email_flows f ON f.id = s.flow_id WHERE s.id = $1`, [id],
  )
  if (!step) return jsonError(404, 'Email not found.')
  try {
    await sendTestEmail(step, step.flow_name, admin.email, SAMPLE_VARS)
  } catch (err) {
    return jsonError(502, `Could not send: ${(err as Error).message}`)
  }
  return jsonOk({ message: `Test sent to ${admin.email}.` })
}
