import { getCurrentStaff } from '@/lib/admin-auth'
import { queryOne } from '@/lib/db'
import { isUuid } from '@/lib/crm/guard'
import { canSeeLead, staffDirectory } from '@/lib/crm/scope'
import type { Answers } from '@/lib/questions'
import { buildReportEmail, toolReportPdf, withCapstones } from '@/lib/report-email'
import { renderHtml } from '@/lib/mailer'
import { getTool } from '@/lib/tools-meta'
import type { ToolResultMap } from '@/lib/tool-types'
import { firstName } from '@/lib/validation'

/** A lead's report as the PDF they get (or ?as=email, the email), for staff who can see that lead. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; tool: string }> }) {
  const me = await getCurrentStaff()
  const { id, tool } = await params
  const meta = getTool(tool)
  if (!me || !meta || !isUuid(id)) return new Response('Not found', { status: 404 })
  const row = await queryOne<{ data: ToolResultMap[typeof meta.id]; answers: Answers; name: string | null; owner_id: string | null }>(
    `SELECT t.data, coalesce(a.answers, '{}') || coalesce(t.staff_answers, '{}') AS answers, u.name, lo.owner_id FROM tool_results t JOIN users u ON u.id = t.user_id LEFT JOIN assessments a ON a.user_id = u.id
       LEFT JOIN lead_owners lo ON lo.user_id = u.id
      WHERE t.user_id = $1 AND t.tool = $2 AND t.status = 'ready'`,
    [id, meta.id],
  )
  if (!row || !canSeeLead(me, row.owner_id, await staffDirectory())) return new Response('Not found', { status: 404 })
  const opts = await withCapstones({ userId: id, to: '', name: firstName(row.name), meta, data: row.data, answers: row.answers })
  if (new URL(request.url).searchParams.get('as') === 'email') {
    return new Response(renderHtml(buildReportEmail(opts)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:" } })
  }
  return new Response(new Uint8Array(toolReportPdf(opts)), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Learnbay-${meta.name.replace(/\s+/g, '-')}.pdf"`, 'Cache-Control': 'no-store' },
  })
}
