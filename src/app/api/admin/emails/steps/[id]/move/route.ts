import { transaction } from '@/lib/db'
import { adminGuard, body, isUuid, saveFlowVersion } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/** Swap an email with its neighbour ({ dir: 'up' | 'down' }). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  const dir = (await body(request)).dir
  if (!isUuid(id) || (dir !== 'up' && dir !== 'down')) return jsonError(400, 'Invalid request.')
  const moved = await transaction(async (db) => {
    const me = (await db.query<{ flow_id: string; position: number }>(`SELECT flow_id, position FROM email_steps WHERE id = $1 FOR UPDATE`, [id])).rows[0]
    if (!me) return null
    const other = (await db.query<{ id: string; position: number }>(
      dir === 'up'
        ? `SELECT id, position FROM email_steps WHERE flow_id = $1 AND position < $2 ORDER BY position DESC LIMIT 1 FOR UPDATE`
        : `SELECT id, position FROM email_steps WHERE flow_id = $1 AND position > $2 ORDER BY position ASC LIMIT 1 FOR UPDATE`,
      [me.flow_id, me.position],
    )).rows[0]
    if (!other) return null
    await db.query(`UPDATE email_steps SET position = CASE WHEN id = $1 THEN $3::int ELSE $4::int END, updated_at = now() WHERE id IN ($1, $2)`, [id, other.id, other.position, me.position])
    return me.flow_id
  })
  if (moved) await saveFlowVersion(moved, `Email moved ${dir}`, admin.email)
  return jsonOk()
}
