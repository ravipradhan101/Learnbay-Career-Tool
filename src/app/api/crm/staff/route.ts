import { body, staffGuard } from '@/lib/crm/guard'
import { createStaff } from '@/lib/crm/staff'
import { jsonError, jsonOk } from '@/lib/security'

/** Admin adds anyone (except another admin); a manager adds associates and ISMs to their own team. */
export async function POST(request: Request) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  if (me.role !== 'admin' && me.role !== 'manager') return jsonError(403, 'You can’t add team members.')
  const r = await createStaff(me, await body(request))
  return r.ok ? jsonOk({ id: r.id, message: r.message }) : jsonError(r.status, r.error)
}
