import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { env } from './env'
import { query, queryOne, transaction } from './db'
import { hmac, randomToken, rateLimits, safeEqualHex, sha256 } from './security'
import { sendAdminCodeEmail } from './mailer'

/**
 * Admin area auth, separate from learner login: email + password (scrypt-hashed) and 8-hour sessions in
 * their own cookie. Passwords are never seeded. The owner sets one with a code emailed to the admin
 * address, or with `npm run admin:password` on the server.
 */
export const ADMIN_COOKIE = 'lcn_admin'
const ADMIN_SESSION_HOURS = 8
const LOCK_AFTER_FAILURES = 5
const LOCK_MINUTES = 15
export const MIN_PASSWORD_LENGTH = 8

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function scrypt(password: string, salt: Buffer, length: number, opts: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize('NFKC'), salt, length, { ...opts, maxmem: SCRYPT.maxmem }, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the hashing work so response time does not reveal whether an account or password exists.
  const parts = (stored ?? '').split('$')
  const valid = parts.length === 6 && parts[0] === 'scrypt'
  const [N, r, p] = valid ? parts.slice(1, 4).map(Number) : [SCRYPT.N, SCRYPT.r, SCRYPT.p]
  const salt = valid ? Buffer.from(parts[4], 'base64') : randomBytes(16)
  const expected = valid ? Buffer.from(parts[5], 'base64') : randomBytes(64)
  const key = await scrypt(password, salt, expected.length, { N, r, p })
  return valid && timingSafeEqual(key, expected)
}

export function passwordProblem(password: string, email: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.length > 200) return 'That password is too long.'
  if (password.toLowerCase() === email.toLowerCase()) return 'Your password cannot be your email.'
  return null
}

export type AdminUser = { id: string; email: string }
type AdminRow = { id: string; email: string; password_hash: string | null; failed_attempts: number; locked_until: Date | null }
type Result = { ok: true } | { ok: false; status: number; error: string }

/** Admin accounts live in admin_users; any address in ADMIN_EMAILS (.env) is added on first use. */
async function findAdmin(email: string): Promise<AdminRow | null> {
  const row = await queryOne<AdminRow>(`SELECT id, email, password_hash, failed_attempts, locked_until FROM admin_users WHERE email = $1`, [email])
  if (row || !env.adminEmails.includes(email)) return row
  return queryOne<AdminRow>(
    `INSERT INTO admin_users (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, password_hash, failed_attempts, locked_until`,
    [email],
  )
}

async function startAdminSession(adminId: string): Promise<void> {
  const token = randomToken(32)
  const expires = new Date(Date.now() + ADMIN_SESSION_HOURS * 3_600_000)
  await query(`INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES ($1, $2, $3)`, [sha256(token), adminId, expires])
  if (Math.random() < 0.1) query(`DELETE FROM admin_sessions WHERE expires_at < now()`).catch(() => {})
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, token, { httpOnly: true, secure: env.appUrl.startsWith('https://'), sameSite: 'strict', path: '/', expires })
}

const WRONG_PASSWORD = 'Email or password is incorrect.'

export async function adminLogin(email: string, password: string, ip: string): Promise<Result> {
  if (!(await rateLimits([[`adminlogin:ip:${ip}`, 20, 900], [`adminlogin:email:${email}`, 20, 900]]))) {
    return { ok: false, status: 429, error: 'Too many attempts. Please wait 15 minutes.' }
  }
  const admin = await findAdmin(email)
  const matches = await verifyPassword(password, admin?.password_hash ?? null)
  if (!admin) return { ok: false, status: 401, error: WRONG_PASSWORD }
  if (admin.locked_until && admin.locked_until > new Date()) {
    return { ok: false, status: 423, error: 'This account is locked for 15 minutes after repeated failed attempts. Reset the password to unlock it now.' }
  }
  if (!admin.password_hash) return { ok: false, status: 401, error: 'No password is set for this account yet. Use “Set or reset password” below.' }
  if (!matches) {
    await query(
      `UPDATE admin_users SET failed_attempts = failed_attempts + 1,
              locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE locked_until END
        WHERE id = $1`,
      [admin.id, LOCK_AFTER_FAILURES, LOCK_MINUTES],
    )
    return { ok: false, status: 401, error: WRONG_PASSWORD }
  }
  await query(`UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`, [admin.id])
  await startAdminSession(admin.id)
  return { ok: true }
}

/** Emails a 6-digit code to a known admin address. Unknown addresses get the same response, so emails can't be probed. */
export async function requestAdminCode(email: string, ip: string): Promise<Result> {
  if (!(await rateLimits([[`admincode:ip:${ip}`, 10, 3600], [`admincode:email:${email}`, 5, 900]]))) {
    return { ok: false, status: 429, error: 'Too many code requests. Please wait a few minutes.' }
  }
  const admin = await findAdmin(email)
  if (!admin) return { ok: true }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await query(
    `WITH old AS (UPDATE admin_codes SET consumed_at = now() WHERE admin_id = $1 AND consumed_at IS NULL)
     INSERT INTO admin_codes (admin_id, code_hash, expires_at) VALUES ($1, $2, now() + interval '10 minutes')`,
    [admin.id, hmac(`admin:${admin.id}:${code}`)],
  )
  await sendAdminCodeEmail(admin.email, code)
  return { ok: true }
}

/** Checks the emailed code, sets the new password, clears any lockout, signs out other sessions and signs this one in. */
export async function resetAdminPassword(email: string, code: string, password: string): Promise<Result> {
  const problem = passwordProblem(password, email)
  if (problem) return { ok: false, status: 400, error: problem }
  const invalid: Result = { ok: false, status: 400, error: 'That code is incorrect or has expired. Request a new one.' }
  if (!/^\d{6}$/.test(code)) return invalid
  const admin = await findAdmin(email)
  if (!admin) return invalid
  const hash = await hashPassword(password)
  const done = await transaction(async (db) => {
    const row = (await db.query<{ id: string; code_hash: string; attempts: number }>(
      `SELECT id, code_hash, attempts FROM admin_codes
        WHERE admin_id = $1 AND consumed_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [admin.id],
    )).rows[0]
    if (!row || row.attempts >= 5) return false
    if (!safeEqualHex(row.code_hash, hmac(`admin:${admin.id}:${code}`))) {
      await db.query(`UPDATE admin_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id])
      return false
    }
    await db.query(`UPDATE admin_codes SET consumed_at = now() WHERE id = $1`, [row.id])
    await db.query(`UPDATE admin_users SET password_hash = $2, failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`, [admin.id, hash])
    await db.query(`DELETE FROM admin_sessions WHERE admin_id = $1`, [admin.id])
    return true
  })
  if (!done) return invalid
  await startAdminSession(admin.id)
  return { ok: true }
}

export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token || token.length > 100) return null
  return queryOne<AdminUser>(
    `SELECT a.id, a.email FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  )
})

/** Only /admin pages (no protocol-relative or odd paths) are accepted as a post-login destination. */
export function safeAdminNext(value: unknown): string {
  return typeof value === 'string' && /^\/admin(\/[A-Za-z0-9\-/]*)?(\?[A-Za-z0-9=&%._\-]*)?$/.test(value) && !value.startsWith('/admin/login') ? value : '/admin'
}

/**
 * Every admin page calls this itself (not only the layout): layouts are not re-run on every navigation,
 * so page-level checks are what actually protect the data. Signed-out admins return to this page after login.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    const path = (await headers()).get('x-pathname') ?? '/admin'
    redirect(`/admin/login?next=${encodeURIComponent(safeAdminNext(path))}`)
  }
  return admin
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE)?.value
  if (token) await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [sha256(token)])
  jar.delete(ADMIN_COOKIE)
}
