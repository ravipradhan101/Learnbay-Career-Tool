import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ITEMS = 150
const MAX_BYTES = 300_000

const KINDS = new Set(['bot', 'event', 'user', 'divider', 'card'])

/** Only the shapes the chat really saves: known kinds, text that is text, cards with a type. Anything else is dropped. */
function cleanItem(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const i = raw as Record<string, unknown>
  if (typeof i.kind !== 'string' || !KINDS.has(i.kind)) return null
  if (i.kind === 'card') {
    const card = i.card as Record<string, unknown> | undefined
    return card && typeof card === 'object' && typeof card.type === 'string' ? i : null
  }
  if (typeof i.text !== 'string') return null
  return { ...i, text: i.text.slice(0, 6000) }
}

/** One saved chat (only the owner can read it). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError(404, 'Chat not found.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const row = await queryOne<{ id: string; title: string; counsellor: string | null; items: unknown[] }>(
    `SELECT id, title, counsellor, items FROM chat_threads WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  )
  if (!row) return jsonError(404, 'Chat not found.')
  return jsonOk({ thread: row })
}

/**
 * Saves the conversation as it looks on screen (messages, cards, notices). The items are display data only:
 * they are rendered as text by React and never trusted for anything else.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError(404, 'Chat not found.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`chat-save:${user.id}`, 900, 3600))) return jsonError(429, 'Saving too often.')
  const body = await readJson<{ items?: unknown; title?: unknown }>(request, MAX_BYTES + 5_000)
  if (!body || !Array.isArray(body.items)) return jsonError(400, 'Invalid chat.')
  const items = body.items.map(cleanItem).filter((i): i is Record<string, unknown> => i !== null).slice(-MAX_ITEMS)
  const json = JSON.stringify(items)
  if (json.length > MAX_BYTES) return jsonError(413, 'This chat is too long to save. Start a new chat.')
  const title = cleanText(body.title, 80) || null
  const row = await queryOne<{ id: string }>(
    `UPDATE chat_threads SET items = $3::jsonb, title = COALESCE($4, title), updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, user.id, json, title],
  )
  if (!row) return jsonError(404, 'Chat not found.')
  return jsonOk({ saved: true })
}
