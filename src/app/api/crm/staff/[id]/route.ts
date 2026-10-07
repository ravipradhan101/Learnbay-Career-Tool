import { body, isUuid, staffGuard } from '@/lib/crm/guard'
import { updateStaff } from '@/lib/crm/staff'
import { jsonError, jsonOk } from '@/lib/security'

/** Edit, move, pause or deactivate a team member (rules in lib/crm/staff). There is no delete: history must stay. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  const { id } = await params
  if (!isUuid(id) || (me.role !== 'admin' && me.role !== 'manager')) return jsonError(404, 'Not found.')
  const r = await updateStaff(me, id, await body(request))
  return r.ok ? jsonOk({ message: r.message }) : jsonError(r.status, r.error)
}
