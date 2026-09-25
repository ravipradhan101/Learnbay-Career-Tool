import { getCurrentAdmin } from '@/lib/admin-auth'
import { queryOne } from '@/lib/db'
import type { Answers } from '@/lib/questions'
import { buildReportEmail, toolReportPdf } from '@/lib/report-email'
import { renderHtml } from '@/lib/mailer'
import { getTool } from '@/lib/tools-meta'
import type { ToolResultMap } from '@/lib/tool-types'
import { firstName } from '@/lib/validation'

/** Admins (e.g. counsellors before a call) can open the exact PDF report a learner received. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; tool: string }> }) {
  if (!(await getCurrentAdmin())) return new Response('Not found', { status: 404 })
  const { id, tool } = await params
  const meta = getTool(tool)
  if (!meta || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response('Not found', { status: 404 })
  const row = await queryOne<{ data: ToolResultMap[typeof meta.id]; answers: Answers; name: string | null }>(
    `SELECT t.data, a.answers, u.name FROM tool_results t JOIN users u ON u.id = t.user_id JOIN assessments a ON a.user_id = u.id
      WHERE t.user_id = $1 AND t.tool = $2 AND t.status = 'ready'`,
    [id, meta.id],
  )
  if (!row) return new Response('Not found', { status: 404 })
  const opts = { userId: id, to: '', name: firstName(row.name), meta, data: row.data, answers: row.answers }
  // ?as=email shows the report email exactly as the learner received it (all values are HTML-escaped).
  if (new URL(request.url).searchParams.get('as') === 'email') {
    return new Response(renderHtml(buildReportEmail(opts)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:" } })
  }
  const pdf = toolReportPdf(opts)
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Learnbay-${meta.name.replace(/\s+/g, '-')}.pdf"`, 'Cache-Control': 'no-store' },
  })
}
