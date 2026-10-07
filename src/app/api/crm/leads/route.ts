import { body, staffGuard } from '@/lib/crm/guard'
import { createLead } from '@/lib/crm/lead-actions'
import { jsonError, jsonOk } from '@/lib/security'

/** Staff create a lead (and choose who gets it, within their own team). */
export async function POST(request: Request) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  const r = await createLead(me, await body(request))
  return r.ok ? jsonOk({ message: r.message, ...r.data }) : jsonError(r.status, r.error, r.data)
}
