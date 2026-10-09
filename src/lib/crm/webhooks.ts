import { createHmac } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { background } from '../background'
import { query, queryOne } from '../db'
import { env } from '../env'
import { randomToken } from '../security'

/**
 * Outgoing webhooks: everything that happens to a lead here, sent to the main Sales CRM (and any other tool a developer
 * connects on the Developers page). Each request is signed so the receiver can prove it came from us:
 *
 *   X-Learnbay-Event:      lead.created
 *   X-Learnbay-Delivery:   evt_…  (unique; use it to ignore repeats)
 *   X-Learnbay-Signature:  t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the endpoint secret>
 *
 * The body always names the person by email and phone and says how to apply it: the main CRM matches on email first,
 * then phone, and when the person already exists it never overwrites a field; it only adds what is missing and appends
 * the activity ("mode": "enrich"). A person the main CRM did not have arrives as "mode": "create".
 *
 * CRM_WEBHOOK_URL in the environment (optional) receives every event too, with Authorization: Bearer CRM_API_KEY and a
 * signature when CRM_WEBHOOK_SECRET is set.
 */

export const WEBHOOK_EVENTS = [
  { id: 'lead.created', label: 'New lead (sign-up, staff or API)' },
  { id: 'lead.matched', label: 'Main CRM already had this person' },
  { id: 'lead.assigned', label: 'Lead given to an owner' },
  { id: 'lead.status_changed', label: 'Status changed (by a call outcome or sync)' },
  { id: 'note.added', label: 'Note added' },
  { id: 'call.booked', label: 'Learner booked a counselling call' },
  { id: 'call.logged', label: 'Call outcome logged' },
  { id: 'meeting.booked', label: 'Meeting booked by staff' },
  { id: 'report.generated', label: 'Report built or rebuilt' },
  { id: 'report.emailed', label: 'Report emailed to the learner' },
  { id: 'eligibility.completed', label: 'Eligibility test finished' },
  { id: 'insights.updated', label: 'AI brief and intent score refreshed' },
] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]['id'] | 'ping'
export const isWebhookEvent = (v: unknown): v is WebhookEvent => typeof v === 'string' && WEBHOOK_EVENTS.some((e) => e.id === v)
/** A clean list of event names from a request ("*" means all). */
export const eventsFrom = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((e) => e === '*' || isWebhookEvent(e)))] as string[] : [])

const TIMEOUT_MS = 8_000

/** Loopback, private, link-local, carrier-grade NAT, unique-local, NAT64 and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (v === 6) {
    const h = ip.toLowerCase()
    if (h.startsWith('::ffff:')) return isPrivateIp(h.slice(7)) || !isIP(h.slice(7))
    return h === '::' || h === '::1' || /^(fc|fd|fe[89ab]|fec|fed|fee|fef|ff)/.test(h) || h.startsWith('64:ff9b') || h.startsWith('100::') || h.startsWith('2001:db8') || /^::[0-9a-f]/.test(h)
  }
  return true
}

/** Only public https addresses: no localhost, no private or link-local IPs (the server must not be pointed inwards). */
export function webhookUrlProblem(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 500) return 'Enter the endpoint URL.'
  let u: URL
  try { u = new URL(raw.trim()) } catch { return 'That is not a valid URL.' }
  if (u.protocol !== 'https:') return 'The URL must start with https://'
  if (u.username || u.password) return 'Put credentials in the receiver, not in the URL.'
  if (u.port && u.port !== '443') return 'Use the standard https port (443).'
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return 'Use a public address.'
  if (isIP(host) && isPrivateIp(host)) return 'Use a public address.'
  return null
}

/**
 * Checked again at send time, after DNS: a public-looking name that resolves to a private address (e.g. 127.0.0.1.nip.io)
 * is refused.
 */
async function resolvesPublic(raw: string): Promise<boolean> {
  if (webhookUrlProblem(raw)) return false
  const host = new URL(raw).hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) return !isPrivateIp(host)
  try {
    const all = await lookup(host, { all: true, verbatim: true })
    return all.length > 0 && all.every((a) => !isPrivateIp(a.address))
  } catch {
    return false
  }
}

export const newWebhookSecret = () => `whsec_${randomToken(24)}`

export function sign(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`
}

type Snapshot = {
  id: string; email: string; name: string | null; phone: string | null; created_at: Date; status: string; source: string | null
  owner_email: string | null; owner_name: string | null; owner_role: string | null; crm_id: string | null; existed: boolean | null; matched_by: string | null
  intent: number | null; band: string | null
}

async function snapshot(userId: string): Promise<Snapshot | null> {
  return queryOne<Snapshot>(
    `SELECT u.id, u.email, u.name, CASE WHEN u.phone IS NULL THEN NULL ELSE coalesce(u.phone_country, '') || u.phone END AS phone, u.created_at,
            coalesce(lo.status, 'new') AS status, lo.source, s.email AS owner_email, s.name AS owner_name, s.role AS owner_role,
            le.crm_id, le.existed, le.matched_by, li.intent, li.band
       FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id LEFT JOIN admin_users s ON s.id = lo.owner_id
       LEFT JOIN lead_external le ON le.user_id = u.id LEFT JOIN lead_insights li ON li.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  )
}

/** The JSON every receiver gets. */
export function payloadFor(event: WebhookEvent, s: Snapshot, data: Record<string, unknown>) {
  return {
    id: `evt_${randomToken(12)}`,
    event,
    createdAt: new Date().toISOString(),
    mode: s.existed ? 'enrich' : 'create',
    match: { email: s.email, phone: s.phone },
    policy: 'never_override',
    lead: {
      id: s.id, email: s.email, name: s.name, phone: s.phone, status: s.status, source: s.source, signedUpAt: new Date(s.created_at).toISOString(),
      owner: s.owner_email ? { email: s.owner_email, name: s.owner_name, role: s.owner_role } : null,
      crm: { id: s.crm_id, existed: Boolean(s.existed), matchedBy: s.matched_by },
      intent: s.intent === null ? null : { score: s.intent, band: s.band },
      url: `${env.appUrl}/admin/crm/leads/${s.id}`,
    },
    data,
  }
}

export type Endpoint = { id: string; url: string; secret: string }
export type DeliveryResult = { ok: boolean; status: number | null; durationMs: number; response: string }

/** One signed POST, logged to webhook_deliveries. Never throws. */
export async function deliver(ep: Endpoint, event: string, payload: Record<string, unknown>): Promise<DeliveryResult> {
  const body = JSON.stringify(payload)
  const started = Date.now()
  let r: DeliveryResult
  try {
    if (!(await resolvesPublic(ep.url))) throw new Error('The address does not resolve to a public server.')
    const res = await fetch(ep.url, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Learnbay-Pseudo-CRM/1', 'X-Learnbay-Event': event, 'X-Learnbay-Delivery': String(payload.id ?? ''), 'X-Learnbay-Signature': sign(ep.secret, body) },
      body,
    })
    // The receiver's body is never kept or shown (it could be used to read pages from inside other networks).
    await res.body?.cancel().catch(() => {})
    r = { ok: res.status >= 200 && res.status < 300, status: res.status, durationMs: Date.now() - started, response: res.status >= 300 && res.status < 400 ? 'Redirects are not followed.' : '' }
  } catch (err) {
    r = { ok: false, status: null, durationMs: Date.now() - started, response: (err as Error).message.slice(0, 300) }
  }
  await query(
    `INSERT INTO webhook_deliveries (endpoint_id, event, payload, status, ok, duration_ms, response) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ep.id, event, body, r.status, r.ok, r.durationMs, r.response || null],
  ).catch((err) => console.error('[webhook] log failed', (err as Error).message))
  return r
}

async function deliverToEnv(event: string, payload: Record<string, unknown>) {
  const url = process.env.CRM_WEBHOOK_URL
  if (!url || !(await resolvesPublic(url))) return
  const body = JSON.stringify(payload)
  const key = process.env.CRM_API_KEY
  const secret = process.env.CRM_WEBHOOK_SECRET
  try {
    const res = await fetch(url, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Learnbay-Pseudo-CRM/1', 'X-Learnbay-Event': event, 'X-Learnbay-Delivery': String(payload.id ?? ''), ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(secret ? { 'X-Learnbay-Signature': sign(secret, body) } : {}) },
      body,
    })
    if (!res.ok) console.error(`[webhook] main CRM answered ${res.status} for ${event}`)
  } catch (err) {
    console.error('[webhook] main CRM failed', (err as Error).message)
  }
}

/**
 * Tells every connected tool that something happened to a lead. Runs after the response, never slows or breaks the
 * caller, and costs one small query when nothing is connected.
 */
export function emitLeadEvent(event: Exclude<WebhookEvent, 'ping'>, userId: string, data: Record<string, unknown> = {}): void {
  background(`webhook:${event}`, async () => {
    const endpoints = await query<Endpoint>(`SELECT id, url, secret FROM webhook_endpoints WHERE active AND ($1 = ANY(events) OR '*' = ANY(events))`, [event])
    if (!endpoints.length && !process.env.CRM_WEBHOOK_URL) return
    const s = await snapshot(userId)
    if (!s) return
    const payload = payloadFor(event, s, data)
    await Promise.all([...endpoints.map((ep) => deliver(ep, event, payload)), deliverToEnv(event, payload)])
  })
}

/** A sample event so a developer can check their receiver and signature code. */
export async function sendPing(ep: Endpoint): Promise<DeliveryResult> {
  const payload = {
    id: `evt_${randomToken(12)}`, event: 'ping', createdAt: new Date().toISOString(), mode: 'create', match: { email: 'test.lead@example.com', phone: '+919999999999' }, policy: 'never_override',
    lead: { id: '00000000-0000-0000-0000-000000000000', email: 'test.lead@example.com', name: 'Test Lead', phone: '+919999999999', status: 'new', source: 'round_robin', owner: null, crm: { id: null, existed: false, matchedBy: null }, intent: { score: 42, band: 'warm' } },
    data: { message: 'This is a test from the Pseudo Sales CRM. Nothing to save.' },
  }
  return deliver(ep, 'ping', payload)
}

/** Sends a logged delivery again (same body, fresh signature). */
export async function resend(deliveryId: number): Promise<DeliveryResult | null> {
  const d = await queryOne<{ event: string; payload: Record<string, unknown>; endpoint_id: string; url: string; secret: string; active: boolean }>(
    `SELECT d.event, d.payload, d.endpoint_id, e.url, e.secret, e.active FROM webhook_deliveries d JOIN webhook_endpoints e ON e.id = d.endpoint_id WHERE d.id = $1`,
    [deliveryId],
  )
  if (!d) return null
  return deliver({ id: d.endpoint_id, url: d.url, secret: d.secret }, d.event, d.payload)
}
