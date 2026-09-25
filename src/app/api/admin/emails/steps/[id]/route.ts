import { query, queryOne } from '@/lib/db'
import { adminGuard, body, isUuid, parseStep, saveFlowVersion } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

type Ctx = { params: Promise<{ id: string }> }

/** Edit an email, or pause / resume just this email ({ status } only). Paused emails are skipped; the flow carries on. */
export async function PATCH(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Email not found.')
  const b = await body(request)
  if (Object.keys(b).length === 1 && (b.status === 'active' || b.status === 'paused')) {
    const row = await queryOne<{ flow_id: string; subject: string }>(`UPDATE email_steps SET status = $2, updated_at = now() WHERE id = $1 RETURNING flow_id, subject`, [id, b.status])
    if (!row) return jsonError(404, 'Email not found.')
    await saveFlowVersion(row.flow_id, `Email ${b.status === 'paused' ? 'paused' : 'resumed'}: ${row.subject.slice(0, 60)}`, admin.email)
    return jsonOk()
  }
  const { value: s, error } = parseStep(b)
  if (!s) return jsonError(400, error ?? 'Invalid email.')
  const row = await queryOne<{ flow_id: string }>(
    `UPDATE email_steps SET delay_minutes = $2, conditions = $3, subject = $4, preheader = $5, heading = $6, body = $7, cta_label = $8, cta_path = $9, updated_at = now()
      WHERE id = $1 RETURNING flow_id`,
    [id, s.delayMinutes, s.conditions, s.subject, s.preheader || null, s.heading, s.body, s.ctaLabel || null, s.ctaPath || null],
  )
  if (!row) return jsonError(404, 'Email not found.')
  await saveFlowVersion(row.flow_id, `Email edited: ${s.subject.slice(0, 60)}`, admin.email)
  return jsonOk()
}

export async function DELETE(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Email not found.')
  const row = await queryOne<{ flow_id: string; subject: string }>(`DELETE FROM email_steps WHERE id = $1 RETURNING flow_id, subject`, [id])
  if (row) await saveFlowVersion(row.flow_id, `Email deleted: ${row.subject.slice(0, 60)}`, admin.email)
  return jsonOk()
}
