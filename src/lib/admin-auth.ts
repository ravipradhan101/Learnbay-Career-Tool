import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { env } from './env'
import { query, queryOne, transaction } from './db'
import { hmac, overLimit, randomToken, rateLimit, rateLimits, safeEqualHex, sha256 } from './security'
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
export type StaffRole = 'admin' | 'manager' | 'associate' | 'ism'
/** Anyone signed in to the staff side. Only role 'admin' may open the admin reports; everyone uses /admin/crm. */
export type StaffUser = { id: string; email: string; name: string | null; role: StaffRole; manager_id: string | null; associate_id: string | null }
type AdminRow = { id: string; email: string; password_hash: string | null; failed_attempts: number; locked_until: Date | null; active: boolean }
type Result = { ok: true } | { ok: false; status: number; error: string }

/**
 * Staff accounts live in admin_users; any address in ADMIN_EMAILS (.env) is added on first use as a manager
 * (there is only ever one admin, set in the database, so an env change can never create a second one).
 */
async function findAdmin(email: string): Promise<AdminRow | null> {
  const row = await queryOne<AdminRow>(`SELECT id, email, password_hash, failed_attempts, locked_until, active FROM admin_users WHERE email = $1`, [email])
  if (row || !env.adminEmails.includes(email)) return row
  return queryOne<AdminRow>(
    `INSERT INTO admin_users (email, role) VALUES ($1, 'manager') ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, password_hash, failed_attempts, locked_until, active`,
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
  // Lockout is per email AND network: someone guessing from elsewhere can't lock the real person out, and every failure
  // (unknown email, no password yet, locked, wrong password) gets the same answer, so emails can't be probed.
  const lockKey = `adminfail:${email}:${ip}`
  if (await overLimit(lockKey, LOCK_AFTER_FAILURES, LOCK_MINUTES * 60)) {
    return { ok: false, status: 429, error: `Too many failed attempts. Wait ${LOCK_MINUTES} minutes, or use “Set or reset password” below.` }
  }
  const admin = await findAdmin(email)
  const matches = await verifyPassword(password, admin?.password_hash ?? null)
  if (!admin || !admin.password_hash || !matches) {
    await rateLimit(lockKey, LOCK_AFTER_FAILURES, LOCK_MINUTES * 60)
    return { ok: false, status: 401, error: `${WRONG_PASSWORD} First time here? Use “Set or reset password” below.` }
  }
  if (!admin.active) return { ok: false, status: 403, error: 'This account has been deactivated. Please ask your manager or the admin.' }
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
  if (!admin || !admin.active) return { ok: true }
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
  // At most 10 wrong codes a day per account, across all its codes (codes can't be ground down by requesting new ones).
  if (await overLimit(`admincodefail:${email}`, 10, 86_400)) return { ok: false, status: 429, error: 'Too many wrong codes today. Please try again tomorrow.' }
  const admin = await findAdmin(email)
  if (!admin || !admin.active) { await rateLimit(`admincodefail:${email}`, 10, 86_400); return invalid }
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
  if (!done) { await rateLimit(`admincodefail:${email}`, 10, 86_400); return invalid }
  await startAdminSession(admin.id)
  return { ok: true }
}

/** The signed-in staff member (any role), or null. Deactivated accounts are signed out everywhere at once. */
export const getCurrentStaff = cache(async (): Promise<StaffUser | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token || token.length > 100) return null
  return queryOne<StaffUser>(
    `SELECT a.id, a.email, a.name, a.role, a.manager_id, a.associate_id FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND a.active`,
    [sha256(token)],
  )
})

/**
 * The signed-in admin, or null. Only the single 'admin' role counts, so managers, associates and ISMs can never
 * reach the admin reports or admin APIs (every one of them checks this, directly or through requireAdmin/adminGuard).
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const staff = await getCurrentStaff()
  return staff?.role === 'admin' ? { id: staff.id, email: staff.email } : null
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
    // Signed-in sales staff belong in the CRM, not on the login page.
    if (await getCurrentStaff()) redirect('/admin/crm')
    const path = (await headers()).get('x-pathname') ?? '/admin'
    redirect(`/admin/login?next=${encodeURIComponent(safeAdminNext(path))}`)
  }
  return admin
}

/** Every staff (CRM) page calls this itself, for the same reason as requireAdmin. */
export async function requireStaff(): Promise<StaffUser> {
  const staff = await getCurrentStaff()
  if (!staff) {
    const path = (await headers()).get('x-pathname') ?? '/admin/crm'
    redirect(`/admin/login?next=${encodeURIComponent(safeAdminNext(path))}`)
  }
  return staff
}

/** Where a staff member lands after signing in: the admin goes where they asked; everyone else only into the CRM. */
export function landingFor(role: StaffRole, next: string): string {
  if (role === 'admin') return next
  return next.startsWith('/admin/crm') ? next : '/admin/crm'
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE)?.value
  if (token) await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [sha256(token)])
  jar.delete(ADMIN_COOKIE)
}
