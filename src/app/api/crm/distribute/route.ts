import { distributeUnassigned } from '@/lib/crm/allocate'
import { staffGuard } from '@/lib/crm/guard'
import { jsonError, jsonOk } from '@/lib/security'

export const maxDuration = 60

/** Admin only: give unassigned leads to ISMs by round robin. */
export async function POST(request: Request) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  if (me.role !== 'admin') return jsonError(403, 'Only the admin can distribute leads.')
  const r = await distributeUnassigned(me)
  if (!r.assigned && r.left) return jsonError(409, 'No ISM is available in the round robin. Add an ISM or resume one first.')
  return jsonOk({ message: `${r.assigned} lead${r.assigned === 1 ? '' : 's'} distributed.${r.left ? ` ${r.left} still unassigned; run it again.` : ''}` })
}
