import { query, queryOne } from '../db'
import { jsonError, rateLimit, randomToken, sha256 } from '../security'

/**
 * API keys for developers connecting other tools (the main Sales CRM first). A key is shown once when created; only its
 * SHA-256 hash is stored. Send it as `Authorization: Bearer lbk_…`. Scopes: "read" (look up and read leads) and
 * "write" (create leads, add notes, sync status from the main CRM).
 */
export type ApiScope = 'read' | 'write'
export type ApiKey = { id: string; name: string; scopes: ApiScope[] }

export function newApiKey(): { key: string; prefix: string; hash: string } {
  const key = `lbk_${randomToken(30)}`
  return { key, prefix: key.slice(0, 12), hash: sha256(key) }
}

/** The calling key, or a JSON error response (401 / 403 / 429). */
export async function apiAuth(request: Request, scope: ApiScope = 'read'): Promise<ApiKey | Response> {
  const header = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(lbk_[A-Za-z0-9_-]{20,80})$/.exec(header.trim())
  if (!m) return jsonError(401, 'Send your API key as: Authorization: Bearer lbk_…')
  const row = await queryOne<{ id: string; name: string; scopes: ApiScope[]; last_used_at: Date | null }>(
    `SELECT id, name, scopes, last_used_at FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
    [sha256(m[1])],
  )
  if (!row) return jsonError(401, 'This API key is not valid or was revoked.')
  if (!row.scopes.includes(scope)) return jsonError(403, `This key does not have the "${scope}" scope.`)
  if (!(await rateLimit(`api:key:${row.id}`, 1200, 3600))) return jsonError(429, 'Rate limit: 1,200 requests an hour per key.')
  if (!row.last_used_at || Date.now() - new Date(row.last_used_at).getTime() > 60_000) {
    void query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [row.id]).catch(() => {})
  }
  return { id: row.id, name: row.name, scopes: row.scopes }
}
