import { PROGRAMS } from '@/config/programs'
import { query, queryOne } from '@/lib/db'
import { adminGuard, body } from '@/lib/email/admin'
import { cleanKeywords, cleanLearnerRoles } from '@/lib/project-admin'
import { forgetRoleCache } from '@/lib/project-roles'
import { cleanText, jsonError, jsonOk } from '@/lib/security'

const slug = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

/** Adds a role or specialisation (e.g. "Video editing"), optionally linked to courses straight away. */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const b = await body(request)
  const label = cleanText(b.label, 80)
  if (label.length < 2) return jsonError(400, 'Give the role a name.')
  const key = slug(label)
  if (!key) return jsonError(400, 'Use letters or numbers in the name.')
  const kind = b.kind === 'industry' ? 'industry' : 'role'
  const row = await queryOne<{ key: string }>(
    `INSERT INTO project_domains (key, label, kind, learner_roles, keywords) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING RETURNING key`,
    [key, label, kind, cleanLearnerRoles(b.learnerRoles), cleanKeywords(b.keywords)],
  )
  if (!row) return jsonError(409, 'A role with this name already exists.')
  const programs = (Array.isArray(b.programs) ? b.programs : []).filter((p): p is string => typeof p === 'string' && PROGRAMS.some((x) => x.id === p))
  for (const p of programs) await query(`INSERT INTO course_roles (program_id, domain_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [p, key])
  forgetRoleCache()
  return jsonOk({ key })
}
