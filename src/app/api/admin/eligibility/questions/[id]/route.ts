import { queryOne } from '@/lib/db'
import { parseQuestion, readinessProblem } from '@/lib/eligibility-admin'
import { changeSet, type QuestionSet } from '@/lib/eligibility-sets'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/** Edits a question, or pauses / shows it ({ status } only). Questions are never deleted. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Question not found.')
  const q = await queryOne<{ set_id: string; text: string }>(`SELECT set_id, text FROM set_questions WHERE id = $1`, [id])
  if (!q) return jsonError(404, 'Question not found.')
  const b = await body(request)

  if (Object.keys(b).length === 1 && (b.status === 'active' || b.status === 'paused')) {
    if (b.status === 'paused') {
      // Pausing must not leave a live set with too few questions for learners.
      const set = await queryOne<QuestionSet>(`SELECT * FROM question_sets WHERE id = $1`, [q.set_id])
      if (set?.status === 'active') {
        const remaining = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM set_questions WHERE set_id = $1 AND status = 'active' AND id <> $2`, [q.set_id, id])
        const needed = set.source === 'bank' ? set.questions_per_test : 3
        if ((remaining?.n ?? 0) < needed) return jsonError(400, `This live set needs at least ${needed} active questions. Add another question first, or pause the whole set.`)
      }
    }
    await changeSet(q.set_id, admin.email, `Question ${b.status === 'paused' ? 'hidden' : 'shown'}: ${q.text.slice(0, 60)}`, async (db) => {
      await db.query(`UPDATE set_questions SET status = $2, updated_at = now() WHERE id = $1`, [id, b.status])
    })
    return jsonOk()
  }

  const { value: v, error } = parseQuestion(b)
  if (!v) return jsonError(400, error ?? 'Invalid question.')
  await changeSet(q.set_id, admin.email, `Question edited: ${v.text.slice(0, 60)}`, async (db) => {
    await db.query(
      `UPDATE set_questions SET topic = $2, text = $3, options = $4, correct = $5, seconds = $6, updated_at = now() WHERE id = $1`,
      [id, v.topic, v.text, v.options, v.correct, v.seconds],
    )
  })
  const set = await queryOne<QuestionSet>(`SELECT * FROM question_sets WHERE id = $1`, [q.set_id])
  return jsonOk({ warning: set?.status === 'active' ? await readinessProblem(set) : null })
}
