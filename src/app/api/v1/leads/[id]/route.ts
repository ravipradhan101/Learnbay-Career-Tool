import { apiAuth } from '@/lib/crm/api-keys'
import { apiLead } from '@/lib/crm/api'
import { isUuid } from '@/lib/crm/guard'
import { jsonError, jsonOk } from '@/lib/security'

/** One lead: contact, owner, status, profile, best-fit path, reports, eligibility test, intent score and AI brief. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = await apiAuth(request, 'read')
  if (key instanceof Response) return key
  const { id } = await params
  const lead = isUuid(id) ? await apiLead(id) : null
  return lead ? jsonOk({ lead }) : jsonError(404, 'Lead not found.')
}
