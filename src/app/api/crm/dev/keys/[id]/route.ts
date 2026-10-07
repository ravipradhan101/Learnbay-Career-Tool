import { adminGuard } from '@/lib/crm/dev-guard'
import { isUuid } from '@/lib/crm/guard'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/security'

/** Revokes a key (kept for the record; it stops working at once). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminGuard(request)
  if (me instanceof Response) return me
  const { id } = await params
  const r = isUuid(id) ? await queryOne(`UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id`, [id]) : null
  return r ? jsonOk({ message: 'Key revoked.' }) : jsonError(404, 'Key not found.')
}
