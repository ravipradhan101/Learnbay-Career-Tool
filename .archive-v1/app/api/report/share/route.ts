import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { env } from '@/lib/env'
import { isSameOrigin, jsonError, jsonOk, randomToken } from '@/lib/security'

/** Creates (or returns) a read-only share link. The shared page never shows contact details or current salary. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const row = await queryOne<{ share_token: string }>(
    `UPDATE reports SET share_token = COALESCE(share_token, $2), updated_at = now()
      WHERE user_id = $1 AND status = 'ready' RETURNING share_token`,
    [user.id, randomToken(18)],
  )
  if (!row) return jsonError(404, 'Your report is not ready yet.')
  return jsonOk({ url: `${env.appUrl}/r/${row.share_token}` })
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  await queryOne(`UPDATE reports SET share_token = NULL, updated_at = now() WHERE user_id = $1 RETURNING id`, [user.id])
  return jsonOk()
}
