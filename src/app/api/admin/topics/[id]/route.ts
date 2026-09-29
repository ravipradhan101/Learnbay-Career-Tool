import { query } from '@/lib/db'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

const STATUSES = new Set(['new', 'in-course', 'to-add', 'not-relevant'])

/** The team's decision on a topic a learner asked about: already in the course, to add, or not relevant. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Topic not found.')
  const status = (await body(request)).status
  if (typeof status !== 'string' || !STATUSES.has(status)) return jsonError(400, 'Unknown status.')
  const r = await query(`UPDATE topic_requests SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`, [id, status])
  if (!r.length) return jsonError(404, 'Topic not found.')
  return jsonOk()
}
