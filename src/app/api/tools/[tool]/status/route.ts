import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk, sha256 } from '@/lib/security'
import { getTool } from '@/lib/tools-meta'

/** Polled every few seconds while a tool generates, so it is a single indexed query. */
export async function GET(_request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const meta = getTool((await params).tool)
  if (!meta) return jsonError(404, 'Unknown tool.')
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token || token.length > 100) return jsonError(401, 'Please sign in again.')
  const row = await queryOne<{ status: string | null }>(
    `SELECT t.status FROM sessions s LEFT JOIN tool_results t ON t.user_id = s.user_id AND t.tool = $2
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token), meta.id],
  )
  if (!row) return jsonError(401, 'Please sign in again.')
  return jsonOk({ status: row.status ?? 'none' })
}
