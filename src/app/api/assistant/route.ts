import { randomUUID } from 'node:crypto'
import { ASSISTANT_CONTEXTS, LIMITS, askAssistant, type AssistantContext } from '@/lib/assistant'
import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { getAnswers, getReadyResults } from '@/lib/data'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { firstName } from '@/lib/validation'
import type { ToolResultMap } from '@/lib/tool-types'

export const maxDuration = 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Body = { context?: unknown; message?: unknown; conversationId?: unknown; history?: unknown }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<Body>(request, 12_000)
  const context = ASSISTANT_CONTEXTS.includes(body?.context as AssistantContext) ? (body!.context as AssistantContext) : 'home'
  const message = cleanText(body?.message, LIMITS.maxInput)
  if (!message) return jsonError(400, 'Type a question first.')

  const user = await getCurrentUser()
  // Career AI is available only inside the Studio, after sign-up.
  if (!user) return jsonError(401, 'Please sign in to chat with Career AI.')

  const usage = await queryOne<{ today: number; total: number }>(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today, count(*)::int AS total
       FROM chat_messages WHERE user_id = $1 AND role = 'user'`,
    [user.id],
  )
  if ((usage?.total ?? 0) >= LIMITS.userTotal || (usage?.today ?? 0) >= LIMITS.userPerDay) {
    return jsonError(429, 'You have reached your question limit for now. A mentor can take it from here. Book a free session.', { limit: true })
  }
  if (!(await rateLimit(`assist:user:${user.id}`, 8, 60))) return jsonError(429, 'Please slow down a little and try again in a minute.')

  const [answers, results] = await Promise.all([getAnswers(user.id), getReadyResults(user.id)])
  // Tool chats only see that tool's result; the advisor sees everything.
  const scoped: Partial<ToolResultMap> = context === 'advisor' || context === 'home' ? results : { [context]: results[context as keyof ToolResultMap] }
  const conversationId = typeof body?.conversationId === 'string' && UUID_RE.test(body.conversationId) ? body.conversationId : randomUUID()
  const history = await query<{ role: 'user' | 'model'; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at, id FROM chat_messages WHERE user_id = $1 AND conversation_id = $2
        ORDER BY created_at DESC, id DESC LIMIT 10
     ) h ORDER BY created_at, id`,
    [user.id, conversationId],
  )

  let out
  try {
    out = await askAssistant({ context, signedIn: true, userId: user.id, name: firstName(user.name), answers: answers ?? undefined, results: scoped, history, message })
  } catch (err) {
    console.error('[assistant] failed', (err as Error).message)
    return jsonError(502, 'I am busy right now. Please try again in a moment.')
  }
  await query(
    `INSERT INTO chat_messages (user_id, conversation_id, role, content, context) VALUES ($1, $2, 'user', $3, $5), ($1, $2, 'model', $4, $5)`,
    [user.id, conversationId, message, out.reply, context],
  )
  return jsonOk({ ...out, conversationId })
}
