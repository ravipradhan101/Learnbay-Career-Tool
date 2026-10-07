import { apiAuth } from '@/lib/crm/api-keys'
import { apiListLeads, apiUpsertLead } from '@/lib/crm/api'
import { jsonError, jsonOk, readJson } from '@/lib/security'

/** Leads changed since a time (oldest change first), for syncing. */
export async function GET(request: Request) {
  const key = await apiAuth(request, 'read')
  if (key instanceof Response) return key
  const sp = new URL(request.url).searchParams
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit')) || 50))
  return jsonOk(await apiListLeads({ updatedSince: sp.get('updated_since'), limit, cursor: sp.get('cursor') }))
}

/** Create a lead, or enrich an existing one (matched by email, then phone) without overwriting anything. */
export async function POST(request: Request) {
  const key = await apiAuth(request, 'write')
  if (key instanceof Response) return key
  const b = await readJson<Record<string, unknown>>(request, 16_000)
  if (!b || typeof b !== 'object') return jsonError(400, 'Send a JSON body.')
  const r = await apiUpsertLead(key, b)
  return r.status < 300 ? jsonOk(r.body, r.status) : jsonError(r.status, String(r.body.error))
}
