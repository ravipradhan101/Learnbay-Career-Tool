import { queryOne, transaction } from '@/lib/db'
import { parseSet } from '@/lib/eligibility-admin'
import { snapshotSet } from '@/lib/eligibility-sets'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'
import { saveVersion } from '@/lib/versions'

/**
 * Creates a question set. It starts paused, so it never replaces the live test until the admin switches it on.
 * With { copyFrom: <set id> } it starts as a copy of that set's settings and questions.
 */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const b = await body(request)
  const { value, error } = parseSet(b, true)
  if (!value) return jsonError(400, error ?? 'Invalid question set.')
  const copyFrom = typeof b.copyFrom === 'string' && isUuid(b.copyFrom) ? b.copyFrom : null
  if (copyFrom && !(await queryOne(`SELECT 1 AS x FROM question_sets WHERE id = $1`, [copyFrom]))) return jsonError(404, 'Set to copy was not found.')
  const id = await transaction(async (db) => {
    const row = (await db.query<{ id: string }>(
      copyFrom
        ? `INSERT INTO question_sets (name, description, program_area, source, questions_per_test, seconds_per_question, total_seconds, max_attempts, status)
           SELECT $1, coalesce($2, description), $3, source, questions_per_test, seconds_per_question, total_seconds, max_attempts, 'paused'
             FROM question_sets WHERE id = $4 RETURNING id`
        : `INSERT INTO question_sets (name, description, program_area, source, status) VALUES ($1, $2, $3, coalesce($4, 'bank'), 'paused') RETURNING id`,
      [value.name, value.description ?? null, value.program_area, copyFrom ?? value.source ?? null],
    )).rows[0]
    if (copyFrom) {
      await db.query(
        `INSERT INTO set_questions (set_id, position, topic, text, options, correct, seconds, status)
         SELECT $1, position, topic, text, options, correct, seconds, status FROM set_questions WHERE set_id = $2`,
        [row.id, copyFrom],
      )
    }
    await saveVersion(db, 'question_set', row.id, await snapshotSet(db, row.id), copyFrom ? 'Created as a copy' : 'Created', admin.email)
    return row.id
  })
  return jsonOk({ id })
}
