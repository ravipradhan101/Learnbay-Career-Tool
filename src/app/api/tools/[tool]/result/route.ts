import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import type { Answers } from '@/lib/questions'
import { reportCard } from '@/lib/report-card'
import { jsonError, jsonOk } from '@/lib/security'
import { currentCtcRange } from '@/lib/tools'
import { getTool } from '@/lib/tools-meta'
import type { ToolResultMap } from '@/lib/tool-types'

/** A finished report as the counsellor shows it in the chat (headline, key numbers, one chart, next moves). */
export async function GET(_request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const meta = getTool((await params).tool)
  if (!meta) return jsonError(404, 'Unknown tool.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const row = await queryOne<{ status: string | null; data: ToolResultMap[typeof meta.id] | null; answers: Answers | null }>(
    `SELECT t.status, t.data, a.answers FROM assessments a LEFT JOIN tool_results t ON t.user_id = a.user_id AND t.tool = $2 WHERE a.user_id = $1`,
    [user.id, meta.id],
  )
  if (row?.status !== 'ready' || !row.data) return jsonOk({ status: row?.status ?? 'none', card: null })
  return jsonOk({ status: 'ready', card: reportCard(meta.id, row.data, currentCtcRange(row.answers ?? {})) })
}
