import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { randomInt } from 'node:crypto'
import { env } from './env'
import { query, queryOne } from './db'
import { clientIp, hmac, overLimit, randomToken, rateLimit, rateLimits, safeEqualHex, sha256 } from './security'
import { sendOtpEmail } from './mailer'
import { crmNewLead } from './crm/hooks'

export const SESSION_COOKIE = 'lcn_session'
const SESSION_DAYS = 30
const OTP_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
/** Wrong codes allowed per email per day, across all its codes. */
const OTP_DAILY_FAILURES = 15

export type User = {
  id: string
  email: string
  name: string | null
  phone_country: string | null
  phone: string | null
  created_at: Date
}

// ---------- Sessions ----------

/** A new random session token and its expiry (the token is stored only as a SHA-256 hash). */
export function newSessionToken() {
  const token = randomToken(32)
  return { token, hash: sha256(token), expires: new Date(Date.now() + SESSION_DAYS * 86_400_000) }
}

export async function setSessionCookie(token: string, expires: Date): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: env.appUrl.startsWith('https://'), sameSite: 'lax', path: '/', expires })
}

export async function createSession(userId: string, request: Request): Promise<void> {
  const { token, hash, expires } = newSessionToken()
  // Insert the session and stamp last login in one round trip.
  await query(
    `WITH s AS (INSERT INTO sessions (user_id, token_hash, ip, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING user_id)
     UPDATE users SET last_login_at = now() WHERE id = (SELECT user_id FROM s)`,
    [userId, hash, clientIp(request), request.headers.get('user-agent')?.slice(0, 300) ?? null, expires],
  )
  // Occasional cleanup keeps the table small without a cron job (not on every login, to stay cheap at scale).
  if (Math.random() < 0.05) query(`DELETE FROM sessions WHERE expires_at < now() - interval '1 day'`).catch(() => {})
  await setSessionCookie(token, expires)
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await query(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)])
  jar.delete(SESSION_COOKIE)
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token || token.length > 100) return null
  return queryOne<User>(
    `SELECT u.id, u.email, u.name, u.phone_country, u.phone, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  )
})

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return user
}

// ---------- Users ----------

export async function findUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(`SELECT id, email, name, phone_country, phone, created_at FROM users WHERE email = $1`, [email])
}

export async function findOrCreateUser(email: string): Promise<User> {
  const row = await queryOne<User & { inserted: boolean }>(
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, name, phone_country, phone, created_at, (xmax = 0) AS inserted`,
    [email],
  )
  const { inserted, ...user } = row!
  if (inserted) crmNewLead(user.id)
  return user
}

// ---------- One-time codes ----------

export type OtpRequestResult = { ok: true } | { ok: false; status: number; error: string }

export async function issueOtp(email: string, ip: string): Promise<OtpRequestResult> {
  const ok = await rateLimits([
    [`otp:email:${email}`, 5, 15 * 60],
    [`otp:email:day:${email}`, 12, 24 * 60 * 60], // nobody's inbox can be flooded with codes
    [`otp:ip:${ip}`, 30, 60 * 60],
    ['otp:global', 3000, 10 * 60], // circuit breaker against mass email sending
    // Stay under the mailbox's daily sending quota (Gmail Workspace allows about 2,000 a day): if the mailbox gets
    // blocked, nobody can log in at all. Raise this once login codes go through a dedicated email provider.
    ['otp:global:day', Number(process.env.OTP_DAILY_CAP ?? 1500), 24 * 60 * 60],
  ])
  if (!ok) return { ok: false, status: 429, error: 'Too many code requests. Please wait a few minutes and try again.' }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  // Older unused codes stop working as soon as a new one is issued.
  await query(`UPDATE otp_codes SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL`, [email])
  await query(
    `INSERT INTO otp_codes (email, code_hash, ip, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [email, hmac(`${email}:${code}`), ip, OTP_MINUTES],
  )
  if (Math.random() < 0.05) query(`DELETE FROM otp_codes WHERE created_at < now() - interval '2 days'`).catch(() => {})
  try {
    await sendOtpEmail(email, code)
  } catch (err) {
    console.error('[otp] email send failed', (err as Error).message)
    return { ok: false, status: 502, error: 'We could not send the email right now. Please try again in a minute.' }
  }
  return { ok: true }
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'Enter the 6-digit code from your email.' }
  // Across all codes for this email: at most 15 wrong guesses a day, so codes can't be ground down by requesting new ones.
  if (await overLimit(`otpfail:${email}`, OTP_DAILY_FAILURES, 86_400)) return { ok: false, error: 'Too many wrong codes today. Please try again tomorrow, or contact Learnbay support.' }
  const row = await queryOne<{ id: number; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM otp_codes
      WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1`,
    [email],
  )
  if (!row) return { ok: false, error: 'This code has expired. Request a new one.' }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [row.id])
    return { ok: false, error: 'Too many wrong attempts. Request a new code.' }
  }
  if (!safeEqualHex(row.code_hash, hmac(`${email}:${code}`))) {
    await query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id])
    await rateLimit(`otpfail:${email}`, OTP_DAILY_FAILURES, 86_400)
    const left = OTP_MAX_ATTEMPTS - row.attempts - 1
    return { ok: false, error: left > 0 ? `That code is not right. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Request a new code.' }
  }
  // Consume atomically so the same code cannot be used twice in parallel.
  const consumed = await queryOne(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id`, [row.id])
  if (!consumed) return { ok: false, error: 'This code was already used. Request a new one.' }
  return { ok: true }
}
