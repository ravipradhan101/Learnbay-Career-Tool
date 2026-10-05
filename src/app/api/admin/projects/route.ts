import { queryOne } from '@/lib/db'
import { adminGuard, body } from '@/lib/email/admin'
import { parseProject } from '@/lib/project-admin'
import { domainLabels } from '@/lib/project-roles'
import { jsonError, jsonOk } from '@/lib/security'

/** Add a project to the library (Admin → Projects). */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { value: p, error } = parseProject(await body(request), await domainLabels())
  if (!p) return jsonError(400, error ?? 'Invalid project.')
  const row = await queryOne<{ id: string }>(
    `INSERT INTO projects (title, description, tools, kind, module, domain, programs, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8)
     ON CONFLICT (lower(title), coalesce(domain, '')) DO NOTHING RETURNING id`,
    [p.title, p.description, p.tools, p.kind, p.module, p.domain, p.programs, p.status],
  )
  if (!row) return jsonError(409, 'A project with this title (and domain) already exists.')
  return jsonOk({ id: row.id })
}
