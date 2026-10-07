import type { StaffUser } from '../admin-auth'
import { jsonError } from '../security'
import { staffGuard } from './guard'

/** Developer tools are for the admin only. */
export async function adminGuard(request: Request, write = true): Promise<StaffUser | Response> {
  const me = await staffGuard(request, write)
  if (me instanceof Response) return me
  return me.role === 'admin' ? me : jsonError(403, 'Only the admin can manage developer tools.')
}
