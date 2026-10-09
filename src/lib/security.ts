import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from './env'
import { queryOne } from './db'

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hmac(value: string): string {
  return createHmac('sha256', env.sessionSecret).update(value).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Best-effort client IP for rate limiting.
 * Behind a reverse proxy (TRUST_PROXY=true) the proxy's X-Real-IP, or the entry it appended last to
 * X-Forwarded-For, is authoritative. Without one, the header can be forged by the client, so IP limits
 * are backed by per-account and global limits everywhere they matter.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim()
  const parts = (request.headers.get('x-forwarded-for') ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  const ip = env.trustProxy ? real || parts[parts.length - 1] : parts[parts.length - 1] || real
  return (ip || 'unknown').slice(0, 64)
}

/** Rejects cross-site state-changing requests (CSRF). Browsers always send Origin on POST fetches. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const host = request.headers.get('x-forwarded-host') && env.trustProxy
    ? request.headers.get('x-forwarded-host')
    : request.headers.get('host')
  if (host && originHost === host) return true
  try {
    return originHost === new URL(env.appUrl).host
  } catch {
    return false
  }
}

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: message, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function jsonOk(data: Record<string, unknown> = {}, status = 200) {
  return Response.json({ ok: true, ...data }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Reads a request body but stops as soon as it exceeds maxBytes, so an oversized or endless
 * (chunked) upload can never be buffered into memory. Returns null when too large.
 */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<Buffer | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > maxBytes) return null
  if (!request.body) return Buffer.alloc(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

/** Reads a JSON body with a size cap. Returns null on invalid JSON, wrong content type or oversize bodies. */
export async function readJson<T = unknown>(request: Request, maxBytes = 32_000): Promise<T | null> {
  const type = request.headers.get('content-type') ?? ''
  if (!type.toLowerCase().includes('application/json')) return null
  const raw = await readBodyCapped(request, maxBytes)
  if (!raw) return null
  try {
    return JSON.parse(raw.toString('utf8')) as T
  } catch {
    return null
  }
}

/**
 * Fixed-window rate limiter backed by Postgres, so limits hold across restarts
 * and multiple app instances. Returns true when the call is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key.slice(0, 200), windowSeconds],
  )
  // Occasional housekeeping so the table does not grow forever (about 1 in 500 calls).
  if (Math.random() < 0.002) {
    queryOne(`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`).catch(() => {})
  }
  return (row?.count ?? 1) <= limit
}

/**
 * A per-server-instance counter in memory (no database write). For high-volume, low-stakes circuit breakers such as
 * analytics, where one shared database row would become a hot spot that every request queues on.
 */
const local = new Map<string, { start: number; count: number }>()
export function localLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now()
  const cur = local.get(key)
  if (!cur || now - cur.start > windowSeconds * 1000) { local.set(key, { start: now, count: 1 }); return true }
  cur.count++
  return cur.count <= limit
}

/** True when `key` has already been counted `limit` times in the current window (does not count this call). */
export async function overLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    `SELECT count FROM rate_limits WHERE key = $1 AND window_start >= now() - make_interval(secs => $2)`,
    [key.slice(0, 200), windowSeconds],
  )
  return (row?.count ?? 0) >= limit
}

/** Checks several limits; all must pass. Use with a per-identity key plus a global circuit breaker. */
export async function rateLimits(checks: [key: string, limit: number, windowSeconds: number][]): Promise<boolean> {
  const results = await Promise.all(checks.map(([k, l, w]) => rateLimit(k, l, w)))
  return results.every(Boolean)
}

/** Strips control characters and angle brackets from free text and trims it to a max length. */
export function cleanText(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Single-line fields (names, subjects, roles) never carry line breaks: they could end up in email headers.
    .replace(multiline ? /\r\n?/g : /[\r\n]+/g, multiline ? '\n' : ' ')
    .replace(/[<>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max)
}

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}
