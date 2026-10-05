import { getCurrentUser } from '@/lib/auth'
import { counsellorOf } from '@/lib/counsellor-server'
import { query, queryOne } from '@/lib/db'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'

/** The studio sections that keep their own chat (anything else is the main counselling chat). */
const TOPICS = ['skill-gap', 'salary', 'roadmap', 'eligibility', 'sessions', 'masterclasses']

/** The learner's saved chats, newest first, each with its section (`topic`; null = the main chat). */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const threads = await query<{ id: string; title: string; counsellor: string | null; topic: string | null; updated_at: Date }>(
    `SELECT id, title, counsellor, topic, updated_at FROM chat_threads WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 60`,
    [user.id],
  )
  return jsonOk({ threads })
}

/** Starts a new chat, for a section of the studio (`topic`) or the main chat. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`chat-new:${user.id}`, 30, 3600))) return jsonError(429, 'Too many new chats. Please continue an existing one.')
  const body = await readJson<{ topic?: unknown }>(request, 1_000)
  const topic = typeof body?.topic === 'string' && TOPICS.includes(body.topic) ? body.topic : null
  const counsellor = await counsellorOf(user.id)
  const row = await queryOne<{ id: string }>(`INSERT INTO chat_threads (user_id, counsellor, topic) VALUES ($1, $2, $3) RETURNING id`, [user.id, counsellor, topic])
  return jsonOk({ id: row?.id })
}
