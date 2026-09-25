import { queryOne } from '@/lib/db'
import { adminGuard, body, isUuid, parseStep, saveFlowVersion } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/** Add an email to the end of a flow. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Flow not found.')
  const { value: s, error } = parseStep(await body(request))
  if (!s) return jsonError(400, error ?? 'Invalid email.')
  const row = await queryOne<{ id: string }>(
    `INSERT INTO email_steps (flow_id, position, delay_minutes, conditions, subject, preheader, heading, body, cta_label, cta_path)
     SELECT f.id, coalesce((SELECT max(position) FROM email_steps WHERE flow_id = f.id), 0) + 10, $2, $3, $4, $5, $6, $7, $8, $9
       FROM email_flows f WHERE f.id = $1
     RETURNING id`,
    [id, s.delayMinutes, s.conditions, s.subject, s.preheader || null, s.heading, s.body, s.ctaLabel || null, s.ctaPath || null],
  )
  if (!row) return jsonError(404, 'Flow not found.')
  await saveFlowVersion(id, `Email added: ${s.subject.slice(0, 60)}`, admin.email)
  return jsonOk({ id: row.id })
}
