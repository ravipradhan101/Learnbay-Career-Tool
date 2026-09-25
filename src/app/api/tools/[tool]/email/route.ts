import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { emailToolReport } from '@/lib/report-email'
import { isSameOrigin, jsonError, jsonOk, rateLimit } from '@/lib/security'
import { getTool } from '@/lib/tools-meta'
import { firstName } from '@/lib/validation'
import type { Answers } from '@/lib/questions'
import type { ToolResultMap } from '@/lib/tool-types'

/** Sends one tool's report to the learner's registered email only — never to an address from the request. */
export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const meta = getTool((await params).tool)
  if (!meta) return jsonError(404, 'Unknown tool.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`report-email:${user.id}:${meta.id}`, 3, 60 * 60))) {
    return jsonError(429, 'We have already sent this report a few times. Please check your inbox and spam folder.')
  }
  const row = await queryOne<{ data: ToolResultMap[typeof meta.id]; answers: Answers }>(
    `SELECT t.data, a.answers FROM tool_results t JOIN assessments a ON a.user_id = t.user_id
      WHERE t.user_id = $1 AND t.tool = $2 AND t.status = 'ready'`,
    [user.id, meta.id],
  )
  if (!row) return jsonError(404, 'This report is not ready yet.')
  try {
    await emailToolReport({ userId: user.id, to: user.email, name: firstName(user.name), meta, data: row.data, answers: row.answers })
  } catch (err) {
    console.error('[report-email] failed', (err as Error).message)
    return jsonError(502, 'We could not send the email just now. Please try again in a minute.')
  }
  return jsonOk({ message: `Sent to ${user.email}` })
}
