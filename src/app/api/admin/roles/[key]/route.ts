import { query, queryOne } from '@/lib/db'
import { adminGuard, body } from '@/lib/email/admin'
import { forgetRoleCache } from '@/lib/project-roles'
import { cleanText, jsonError, jsonOk } from '@/lib/security'
import { cleanKeywords, cleanLearnerRoles } from '@/lib/project-admin'

type Ctx = { params: Promise<{ key: string }> }

/** Edit a role: its name, kind, which learners see it and the words that match a typed role. */
export async function PATCH(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { key } = await params
  const b = await body(request)
  const label = b.label === undefined ? null : cleanText(b.label, 80)
  if (label !== null && label.length < 2) return jsonError(400, 'Give the role a name.')
  const kind = b.kind === 'industry' || b.kind === 'role' ? b.kind : null
  const r = await query(
    `UPDATE project_domains SET label = COALESCE($2, label), kind = COALESCE($3, kind),
            learner_roles = COALESCE($4, learner_roles), keywords = COALESCE($5, keywords) WHERE key = $1 RETURNING key`,
    [key, label, kind, b.learnerRoles === undefined ? null : cleanLearnerRoles(b.learnerRoles), b.keywords === undefined ? null : cleanKeywords(b.keywords)],
  )
  forgetRoleCache()
  return r.length ? jsonOk() : jsonError(404, 'Role not found.')
}

/** Removes a role that no project uses (its course links go with it). */
export async function DELETE(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { key } = await params
  const used = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM projects WHERE domain = $1`, [key])
  if (used && used.n > 0) return jsonError(409, `${used.n} projects use this role. Move or delete them first, or pause them instead.`)
  await query(`DELETE FROM project_domains WHERE key = $1`, [key])
  forgetRoleCache()
  return jsonOk()
}
