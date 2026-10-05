import { PROGRAMS } from '@/config/programs'
import { query } from '@/lib/db'
import { adminGuard, body } from '@/lib/email/admin'
import { forgetRoleCache } from '@/lib/project-roles'
import { jsonError, jsonOk } from '@/lib/security'

async function parse(request: Request) {
  const b = await body(request)
  const program = typeof b.program === 'string' && PROGRAMS.some((p) => p.id === b.program) ? b.program : null
  const domain = typeof b.domain === 'string' ? b.domain.slice(0, 60) : null
  return { program, domain, core: b.core === true }
}

/** Links a role to a course ("this course offers projects for designers"); core = every learner of the course sees them. */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { program, domain, core } = await parse(request)
  if (!program || !domain) return jsonError(400, 'Pick a course and a role.')
  const r = await query(
    `INSERT INTO course_roles (program_id, domain_key, core) SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM project_domains WHERE key = $2)
     ON CONFLICT (program_id, domain_key) DO UPDATE SET core = EXCLUDED.core RETURNING program_id`,
    [program, domain, core],
  )
  forgetRoleCache()
  return r.length ? jsonOk() : jsonError(404, 'Role not found.')
}

/** Unlinks a role from a course (its projects stay in the library; pause them to hide them). */
export async function DELETE(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { program, domain } = await parse(request)
  if (!program || !domain) return jsonError(400, 'Pick a course and a role.')
  await query(`DELETE FROM course_roles WHERE program_id = $1 AND domain_key = $2`, [program, domain])
  forgetRoleCache()
  return jsonOk()
}
