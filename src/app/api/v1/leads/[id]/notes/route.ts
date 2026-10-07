import { apiAuth } from '@/lib/crm/api-keys'
import { apiAddNote } from '@/lib/crm/api'
import { isUuid } from '@/lib/crm/guard'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk, readJson } from '@/lib/security'

/** Adds a note to the lead (shown on the lead page, labelled with the key's name). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = await apiAuth(request, 'write')
  if (key instanceof Response) return key
  const { id } = await params
  if (!isUuid(id) || !(await queryOne(`SELECT 1 FROM users WHERE id = $1`, [id]))) return jsonError(404, 'Lead not found.')
  const b = await readJson<Record<string, unknown>>(request, 8_000)
  const r = await apiAddNote(key, id, b?.text)
  return r.status < 300 ? jsonOk(r.body, r.status) : jsonError(r.status, String(r.body.error))
}
