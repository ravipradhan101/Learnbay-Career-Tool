import { queryOne, transaction } from '@/lib/db'
import { adminGuard, body } from '@/lib/email/admin'
import { jsonError, jsonOk } from '@/lib/security'

/**
 * Approve or reject a project idea the AI proposed for a learner (Admin → Projects → Ideas to review). Approving adds it
 * to the library for its program and work profiles, so the next learner like them gets it from the library.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, 'Idea not found.')
  const b = await body(request)
  const idea = await queryOne<{ id: string; title: string; objective: string; outcome: string | null; tools: string[]; program_id: string; profiles: string[]; industry: string | null; status: string }>(
    `SELECT id, title, objective, outcome, tools, program_id, profiles, industry, status FROM project_ideas WHERE id = $1`, [id],
  )
  if (!idea) return jsonError(404, 'Idea not found.')
  if (idea.status !== 'pending') return jsonError(409, `This idea was already ${idea.status}.`)
  if (b.action === 'reject') {
    await queryOne(`UPDATE project_ideas SET status = 'rejected', decided_by = $2, decided_at = now() WHERE id = $1`, [id, admin.id])
    return jsonOk({ message: 'Rejected. Learners no longer see it.' })
  }
  if (b.action !== 'approve') return jsonError(400, 'Unknown action.')
  const title = typeof b.title === 'string' && b.title.trim().length >= 4 ? b.title.trim().slice(0, 120) : idea.title
  const projectId = await transaction(async (db) => {
    const row = (await db.query<{ id: string }>(
      `INSERT INTO projects (title, description, tools, kind, programs, source, source_ref, status, objective, outcome, industry, profiles)
       VALUES ($1, $2, $3, 'domain', $4, 'generated', $5, 'active', $2, $6, $7, $8)
       ON CONFLICT (lower(title), coalesce(domain, '')) DO NOTHING RETURNING id`,
      [title, idea.objective, idea.tools, [idea.program_id], `idea:${idea.id}`, idea.outcome, idea.industry, idea.profiles],
    )).rows[0]
    if (!row) return null
    await db.query(`UPDATE project_ideas SET status = 'approved', project_id = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [id, row.id, admin.id])
    return row.id
  })
  if (!projectId) return jsonError(409, 'A library project with this title already exists. Edit the title and approve again.')
  return jsonOk({ message: 'Added to the library.', projectId })
}
