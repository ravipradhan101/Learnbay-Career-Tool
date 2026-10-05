import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { getReadyResults } from '@/lib/data'
import { triggerFlows } from '@/lib/email/flows'
import { background } from '@/lib/background'
import { sendToolReadyEmail } from '@/lib/mailer'
import { isAnswered, type Answers } from '@/lib/questions'
import { clientIp, isSameOrigin, jsonError, jsonOk, rateLimits } from '@/lib/security'
import { generateTool } from '@/lib/tools'
import { getTool } from '@/lib/tools-meta'
import { firstName } from '@/lib/validation'

export const maxDuration = 180
const MAX_ATTEMPTS = 4

export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const meta = getTool((await params).tool)
  if (!meta) return jsonError(404, 'Unknown tool.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimits([[`gen:user:${user.id}`, 20, 3600], [`gen:ip:${clientIp(request)}`, 60, 3600]]))) return jsonError(429, 'Too many requests. Please try again later.')

  const profile = await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [user.id])
  if (!profile) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start' })
  const missing = meta.questions.filter((q) => !isAnswered(profile.answers, q))
  if (missing.length) return jsonError(400, 'A few answers are still needed.', { missing })

  await query(`INSERT INTO tool_results (user_id, tool) VALUES ($1, $2) ON CONFLICT (user_id, tool) DO NOTHING`, [user.id, meta.id])
  // Claim atomically so double clicks or two tabs never pay for the same result twice.
  const claimed = await queryOne<{ id: string }>(
    `UPDATE tool_results SET status = 'generating', attempts = attempts + 1, generating_started_at = now(), error = NULL, updated_at = now()
      WHERE user_id = $1 AND tool = $2 AND attempts < $3
        AND (status IN ('pending', 'failed') OR (status = 'generating' AND generating_started_at < now() - interval '4 minutes'))
      RETURNING id`,
    [user.id, meta.id, MAX_ATTEMPTS],
  )
  if (!claimed) {
    const row = await queryOne<{ status: string }>(`SELECT status FROM tool_results WHERE user_id = $1 AND tool = $2`, [user.id, meta.id])
    if (row?.status === 'ready') return jsonOk({ status: 'ready' })
    if (row?.status === 'generating') return jsonOk({ status: 'generating' })
    return jsonError(429, 'We could not build this after several tries. Please book a counselling call and we will help you right away.', { exhausted: true })
  }

  try {
    const prior = await getReadyResults(user.id)
    const data = await generateTool(meta.id, profile.answers, firstName(user.name), prior, user.id)
    await query(`UPDATE tool_results SET status = 'ready', data = $2, updated_at = now() WHERE id = $1`, [claimed.id, JSON.stringify(data)])
  } catch (err) {
    const message = (err as Error).message
    console.error(`[tool:${meta.id}] generation failed`, message)
    await query(`UPDATE tool_results SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`, [claimed.id, message.slice(0, 500)])
    return jsonError(502, 'We could not build this just now. Please try again.')
  }
  triggerFlows(user.id, 'tool_completed')
  background('tool:email', () => sendToolReadyEmail(user.id, user.email, firstName(user.name), meta.name, meta.route))
  return jsonOk({ status: 'ready' })
}
