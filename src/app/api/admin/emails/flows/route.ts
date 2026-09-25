import { queryOne } from '@/lib/db'
import { adminGuard, body, parseFlow, saveFlowVersion } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/** Create a flow. New flows start paused, so nothing is sent until the admin has added steps and switched it on. */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { value, error } = parseFlow(await body(request))
  if (!value) return jsonError(400, error ?? 'Invalid flow.')
  const row = await queryOne<{ id: string }>(
    `INSERT INTO email_flows (name, description, trigger, reentry_days, exit_on, status) VALUES ($1, $2, $3, $4, $5, 'paused') RETURNING id`,
    [value.name, value.description ?? null, value.trigger, value.reentryDays ?? 0, value.exitOn ?? []],
  )
  if (row) await saveFlowVersion(row.id, 'Created', admin.email)
  return jsonOk({ id: row?.id })
}
