import { query, queryOne } from '@/lib/db'
import { adminGuard, body, isUuid, parseFlow, saveFlowVersion } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

type Ctx = { params: Promise<{ id: string }> }

/** Update flow settings, or pause / resume it ({ status: 'active' | 'paused' }). */
export async function PATCH(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Flow not found.')
  const b = await body(request)
  const { value, error } = parseFlow(b, true)
  if (!value) return jsonError(400, error ?? 'Invalid flow.')
  const status = b.status === 'active' || b.status === 'paused' ? b.status : null
  if (status === 'active') {
    const steps = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM email_steps WHERE flow_id = $1 AND status = 'active'`, [id])
    if (!steps?.n) return jsonError(400, 'Add at least one active email before switching this flow on.')
  }
  const row = await queryOne<{ id: string }>(
    `UPDATE email_flows SET
        name = coalesce($2, name), description = CASE WHEN $3::boolean THEN $4 ELSE description END, trigger = coalesce($5, trigger),
        reentry_days = coalesce($6, reentry_days), exit_on = coalesce($7, exit_on), status = coalesce($8, status), updated_at = now()
      WHERE id = $1 RETURNING id`,
    [id, value.name ?? null, 'description' in b, value.description ?? null, value.trigger ?? null, value.reentryDays ?? null, value.exitOn ?? null, status],
  )
  if (!row) return jsonError(404, 'Flow not found.')
  const changed = Object.keys(value)
  await saveFlowVersion(id, status && !changed.length ? (status === 'active' ? 'Flow switched on' : 'Flow paused') : `Settings changed${status ? ` (and ${status === 'active' ? 'switched on' : 'paused'})` : ''}`, admin.email)
  return jsonOk()
}

/** Delete a flow, its emails and in-progress enrolments. Send history is kept for reporting. */
export async function DELETE(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Flow not found.')
  // Keep a final backup so the flow can be restored from Admin → Emails → Deleted flows.
  await saveFlowVersion(id, 'Deleted (restorable)', admin.email)
  await query(`DELETE FROM email_flows WHERE id = $1`, [id])
  return jsonOk()
}
