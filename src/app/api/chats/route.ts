import { getCurrentUser } from '@/lib/auth'
import { counsellorOf } from '@/lib/counsellor-server'
import { query, queryOne } from '@/lib/db'
import { isSameOrigin, jsonError, jsonOk, rateLimit } from '@/lib/security'

/** The learner's saved chats, newest first. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const threads = await query<{ id: string; title: string; counsellor: string | null; updated_at: Date }>(
    `SELECT id, title, counsellor, updated_at FROM chat_threads WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 30`,
    [user.id],
  )
  return jsonOk({ threads })
}

/** Starts a new chat. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`chat-new:${user.id}`, 30, 3600))) return jsonError(429, 'Too many new chats. Please continue an existing one.')
  const counsellor = await counsellorOf(user.id)
  const row = await queryOne<{ id: string }>(`INSERT INTO chat_threads (user_id, counsellor) VALUES ($1, $2) RETURNING id`, [user.id, counsellor])
  return jsonOk({ id: row?.id })
}
