import { queryOne } from '@/lib/db'
import { parseSet, readinessProblem } from '@/lib/eligibility-admin'
import { changeSet, type QuestionSet } from '@/lib/eligibility-sets'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/** Updates a set's settings, or pauses / activates it. There is no delete: pause instead. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Question set not found.')
  const current = await queryOne<QuestionSet>(`SELECT * FROM question_sets WHERE id = $1`, [id])
  if (!current) return jsonError(404, 'Question set not found.')
  const { value, error } = parseSet(await body(request))
  if (!value) return jsonError(400, error ?? 'Invalid settings.')
  const next = { ...current, ...value } as QuestionSet
  if (next.status === 'active') {
    const problem = await readinessProblem(next)
    if (problem) return jsonError(400, problem)
  }
  const fields = Object.keys(value)
  const note = fields.length === 1 && value.status ? (value.status === 'active' ? 'Activated' : 'Paused') : `Settings changed: ${fields.join(', ').replace(/_/g, ' ')}`
  await changeSet(id, admin.email, note, async (db) => {
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    if (sets) await db.query(`UPDATE question_sets SET ${sets} WHERE id = $1`, [id, ...fields.map((f) => (value as Record<string, unknown>)[f])])
  })
  return jsonOk()
}
