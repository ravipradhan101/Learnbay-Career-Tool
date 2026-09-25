import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { env } from '@/lib/env'
import { isSameOrigin, jsonError, jsonOk, randomToken } from '@/lib/security'
import { getTool } from '@/lib/tools-meta'

/** Read-only share link for one tool result. Shared pages never show contact details or current CTC. */
export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const meta = getTool((await params).tool)
  if (!meta) return jsonError(404, 'Unknown tool.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const row = await queryOne<{ share_token: string }>(
    `UPDATE tool_results SET share_token = COALESCE(share_token, $3), updated_at = now()
      WHERE user_id = $1 AND tool = $2 AND status = 'ready' RETURNING share_token`,
    [user.id, meta.id, randomToken(18)],
  )
  if (!row) return jsonError(404, 'This result is not ready yet.')
  return jsonOk({ url: `${env.appUrl}/r/${row.share_token}` })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const meta = getTool((await params).tool)
  if (!meta) return jsonError(404, 'Unknown tool.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  await queryOne(`UPDATE tool_results SET share_token = NULL WHERE user_id = $1 AND tool = $2 RETURNING id`, [user.id, meta.id])
  return jsonOk()
}
