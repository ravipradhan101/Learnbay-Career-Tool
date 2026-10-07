import { apiAuth } from '@/lib/crm/api-keys'
import { apiSyncStatus } from '@/lib/crm/api'
import { isUuid } from '@/lib/crm/guard'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk, readJson } from '@/lib/security'

/** The main CRM syncs the lead's status here (staff can't change status in this app). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = await apiAuth(request, 'write')
  if (key instanceof Response) return key
  const { id } = await params
  if (!isUuid(id) || !(await queryOne(`SELECT 1 FROM users WHERE id = $1`, [id]))) return jsonError(404, 'Lead not found.')
  const b = await readJson<Record<string, unknown>>(request, 2_000)
  const r = await apiSyncStatus(key, id, b?.status)
  return r.status < 300 ? jsonOk(r.body, r.status) : jsonError(r.status, String(r.body.error))
}
