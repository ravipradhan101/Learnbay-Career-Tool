import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/auth'
import { query } from '@/lib/db'
import { clientIp, cleanText, isSameOrigin, jsonError, jsonOk, rateLimits, readJson, sha256 } from '@/lib/security'

// Batched product-analytics events from the browser (see src/lib/analytics.ts).
const TYPES = new Set(['page_view', 'page_leave', 'click', 'step_view', 'step_answer', 'step_back', 'action', 'error'])
const ID_RE = /^[a-z0-9-]{8,40}$/i
const MAX_EVENTS = 25

/** Paths are stored without query strings, and share tokens are masked so reports never hold a working link. */
function cleanPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) return null
  const path = value.split(/[?#]/)[0].replace(/^\/r\/[^/]+/, '/r/[token]').slice(0, 200)
  if (path.startsWith('/admin') || path.startsWith('/api')) return null
  return cleanText(path, 200) || null
}

function cleanProps(value: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 10)) {
    const key = cleanText(k, 30).replace(/[^a-z0-9_]/gi, '')
    if (!key) continue
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = Math.round(Math.max(-1e9, Math.min(1e9, v)))
    else if (typeof v === 'boolean') out[key] = v
    else if (typeof v === 'string') { const t = cleanText(v, 120); if (t) out[key] = t }
  }
  return out
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  // Over the limit, drop quietly: analytics must never show an error to a learner.
  if (!(await rateLimits([[`an:ip:${clientIp(request)}`, 600, 3600], ['an:global', 60_000, 600]]))) return jsonOk()
  const body = await readJson<{ v?: unknown; s?: unknown; events?: unknown }>(request, 24_000)
  const visitor = typeof body?.v === 'string' && ID_RE.test(body.v) ? body.v : null
  const session = typeof body?.s === 'string' && ID_RE.test(body.s) ? body.s : null
  if (!visitor || !session || !Array.isArray(body?.events)) return jsonError(400, 'Invalid events.')

  const now = Date.now()
  const rows: { type: string; name: string | null; path: string; props: string; at: string }[] = []
  for (const raw of body.events.slice(0, MAX_EVENTS)) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Record<string, unknown>
    const type = typeof e.type === 'string' && TYPES.has(e.type) ? e.type : null
    const path = cleanPath(e.path)
    if (!type || !path) continue
    const name = type === 'page_view' || type === 'page_leave' ? path : cleanText(e.name, 80) || null
    // Trust the browser's clock only within the last 10 minutes (events are batched a few seconds apart).
    const ts = typeof e.ts === 'number' && e.ts <= now + 5_000 && e.ts >= now - 600_000 ? e.ts : now
    rows.push({ type, name, path, props: JSON.stringify(cleanProps(e.props)), at: new Date(ts).toISOString() })
  }
  if (!rows.length) return jsonOk()

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const tokenHash = token && token.length <= 100 ? sha256(token) : ''
  // One round trip: resolve the signed-in user (if any) and insert the whole batch.
  await query(
    `INSERT INTO analytics_events (visitor_id, session_id, user_id, type, name, path, props, created_at)
     SELECT $1, $2, (SELECT user_id FROM sessions WHERE token_hash = $3 AND expires_at > now()), t.type, t.name, t.path, t.props::jsonb, t.at::timestamptz
       FROM unnest($4::text[], $5::text[], $6::text[], $7::text[], $8::text[]) AS t(type, name, path, props, at)`,
    [visitor, session, tokenHash, rows.map((r) => r.type), rows.map((r) => r.name), rows.map((r) => r.path), rows.map((r) => r.props), rows.map((r) => r.at)],
  )
  // Occasional retention cleanup (ANALYTICS_RETENTION_DAYS, default 400) keeps the table bounded without a cron job.
  if (Math.random() < 0.001) {
    const days = Math.max(30, Number(process.env.ANALYTICS_RETENTION_DAYS ?? '400') || 400)
    query(`DELETE FROM analytics_events WHERE created_at < now() - make_interval(days => $1)`, [days]).catch(() => {})
  }
  return jsonOk()
}
