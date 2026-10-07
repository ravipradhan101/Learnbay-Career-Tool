import { apiAuth } from '@/lib/crm/api-keys'
import { findLead, parsePhone } from '@/lib/crm/api'
import { jsonError, jsonOk, normalizeEmail } from '@/lib/security'

/** Does this person exist here? Matches by email first, then phone. */
export async function GET(request: Request) {
  const key = await apiAuth(request, 'read')
  if (key instanceof Response) return key
  const sp = new URL(request.url).searchParams
  const email = sp.get('email') ? normalizeEmail(sp.get('email')) : null
  const phone = sp.get('phone') ? parsePhone(sp.get('phone')) : null
  if (!email && !phone) return jsonError(400, 'Send ?email= or ?phone= (E.164, e.g. +919876543210).')
  const hit = await findLead(email, phone)
  return jsonOk(hit ? { exists: true, id: hit.id, matchedBy: hit.matchedBy } : { exists: false })
}
