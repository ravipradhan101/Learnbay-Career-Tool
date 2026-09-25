import { queryOne } from '@/lib/db'
import { parseQuestion } from '@/lib/eligibility-admin'
import { changeSet } from '@/lib/eligibility-sets'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/** Adds a question to the end of a set. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id) || !(await queryOne(`SELECT 1 AS x FROM question_sets WHERE id = $1`, [id]))) return jsonError(404, 'Question set not found.')
  const { value: q, error } = parseQuestion(await body(request))
  if (!q) return jsonError(400, error ?? 'Invalid question.')
  const newId = await changeSet(id, admin.email, `Question added: ${q.text.slice(0, 60)}`, async (db) => {
    const row = await db.query<{ id: string }>(
      `INSERT INTO set_questions (set_id, position, topic, text, options, correct, seconds)
       VALUES ($1, coalesce((SELECT max(position) FROM set_questions WHERE set_id = $1), 0) + 10, $2, $3, $4, $5, $6) RETURNING id`,
      [id, q.topic, q.text, q.options, q.correct, q.seconds],
    )
    return row.rows[0].id
  })
  return jsonOk({ id: newId })
}
