import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'
import { cleanText, clientIp, isSameOrigin, jsonError, jsonOk, rateLimits, readJson } from '@/lib/security'

// Engagement signals used for lead scoring. Only known event types are stored.
const TYPES = new Set([
  'first_pick', 'program_click', 'brochure_click', 'masterclass_interest', 'exit_popup_shown', 'exit_popup_action',
  'call_sheet_open', 'resource_click', 'share_created', 'report_emailed', 'why_learnbay_completed', 'usp_click',
])

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  if (!(await rateLimits([[`events:ip:${clientIp(request)}`, 120, 3600], ['events:global', 20000, 600]]))) return jsonOk()
  const body = await readJson<{ type?: unknown; detail?: unknown }>(request, 2_000)
  const type = typeof body?.type === 'string' && TYPES.has(body.type) ? body.type : null
  if (!type) return jsonError(400, 'Unknown event.')
  const detailIn = body?.detail && typeof body.detail === 'object' ? (body.detail as Record<string, unknown>) : {}
  const detail: Record<string, string> = {}
  for (const [k, v] of Object.entries(detailIn).slice(0, 5)) {
    const key = cleanText(k, 30)
    const value = cleanText(typeof v === 'string' ? v : String(v ?? ''), 120)
    if (key && value) detail[key] = value
  }
  const user = await getCurrentUser()
  // Anonymous events are only counted by type; they carry no user link.
  await query(`INSERT INTO lead_events (user_id, type, detail) VALUES ($1, $2, $3)`, [user?.id ?? null, type, JSON.stringify(detail)])
  return jsonOk()
}
