import { body } from '@/lib/crm/guard'
import { adminGuard } from '@/lib/crm/dev-guard'
import { newApiKey } from '@/lib/crm/api-keys'
import { query } from '@/lib/db'
import { cleanText, jsonError, jsonOk } from '@/lib/security'

/** Creates an API key. The key is returned once and never stored (only its hash). */
export async function POST(request: Request) {
  const me = await adminGuard(request)
  if (me instanceof Response) return me
  const b = await body(request)
  const name = cleanText(b.name, 60)
  if (name.length < 2) return jsonError(400, 'Name the key after the tool that will use it.')
  const scopes: ('read' | 'write')[] = ['read']
  if (Array.isArray(b.scopes) && b.scopes.includes('write')) scopes.push('write')
  const k = newApiKey()
  await query(`INSERT INTO api_keys (name, prefix, key_hash, scopes, created_by) VALUES ($1, $2, $3, $4, $5)`, [name, k.prefix, k.hash, scopes, me.id])
  return jsonOk({ key: k.key, message: 'Key created. Copy it now: it will not be shown again.' }, 201)
}
