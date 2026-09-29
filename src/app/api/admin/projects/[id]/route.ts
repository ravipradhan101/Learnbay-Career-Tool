import { query } from '@/lib/db'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { parseProject } from '@/lib/project-admin'
import { jsonError, jsonOk } from '@/lib/security'

type Ctx = { params: Promise<{ id: string }> }

/** Edit a project, or just pause / resume it ({ status } only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Project not found.')
  const b = await body(request)
  if (Object.keys(b).length === 1 && (b.status === 'active' || b.status === 'paused')) {
    const r = await query(`UPDATE projects SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`, [id, b.status])
    return r.length ? jsonOk() : jsonError(404, 'Project not found.')
  }
  const { value: p, error } = parseProject(b)
  if (!p) return jsonError(400, error ?? 'Invalid project.')
  try {
    const r = await query(
      `UPDATE projects SET title = $2, description = $3, tools = $4, kind = $5, module = $6, domain = $7, programs = $8, status = $9, updated_at = now()
        WHERE id = $1 RETURNING id`,
      [id, p.title, p.description, p.tools, p.kind, p.module, p.domain, p.programs, p.status],
    )
    return r.length ? jsonOk() : jsonError(404, 'Project not found.')
  } catch {
    return jsonError(409, 'Another project already has this title (and domain).')
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Project not found.')
  await query(`DELETE FROM projects WHERE id = $1`, [id])
  return jsonOk()
}
