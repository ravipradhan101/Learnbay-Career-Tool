import { createSession, findOrCreateUser, verifyOtp } from '@/lib/auth'
import { queryOne, transaction } from '@/lib/db'
import type { Answers } from '@/lib/questions'
import { mergeAnswers } from '@/lib/validation'
import { triggerFlows } from '@/lib/email/flows'
import { resolveLoginEmail } from '@/lib/login-identity'
import { clientIp, isSameOrigin, jsonError, jsonOk, rateLimits, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  if (!(await rateLimits([[`verify:ip:${clientIp(request)}`, 30, 900], ['verify:global', 6000, 600]]))) {
    return jsonError(429, 'Too many attempts. Please wait a few minutes and try again.')
  }
  const body = await readJson<{ email?: unknown; code?: unknown }>(request, 2_000)
  const resolved = await resolveLoginEmail(body?.email)
  if ('error' in resolved) return jsonError(400, resolved.error)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const email = resolved.email

  const result = await verifyOtp(email, code)
  if (!result.ok) return jsonError(400, result.error)

  // Anyone may sign in with a verified email; a new account is created on first login.
  const user = await findOrCreateUser(email)
  await applyPendingSignup(user.id, email)
  await createSession(user.id, request)
  // Marks the email verified and tells us whether this is the first time (sign-up) or a return visit.
  const profile = await queryOne<{ ok: boolean; first: boolean }>(
    `WITH v AS (
       UPDATE users u SET email_verified_at = coalesce(u.email_verified_at, now())
        FROM (SELECT email_verified_at IS NULL AS first FROM users WHERE id = $1) prev
       WHERE u.id = $1 RETURNING prev.first
     )
     SELECT (a.answers ? 'interest') AND u.phone IS NOT NULL AS ok, (SELECT first FROM v) AS first
       FROM users u LEFT JOIN assessments a ON a.user_id = u.id WHERE u.id = $1`,
    [user.id],
  )
  const onboarded = Boolean(profile?.ok)
  triggerFlows(user.id, profile?.first ? 'signup' : 'login')
  return jsonOk({ onboarded, redirect: onboarded ? '/dashboard' : '/start' })
}

/**
 * A sign-up that arrived for an email that already had an account (held by /api/onboarding until now): the code proves
 * the email is theirs, so their details are applied. A brand-new (never verified) account takes the latest details; a
 * verified account only fills what is missing.
 */
async function applyPendingSignup(userId: string, email: string) {
  await transaction(async (db) => {
    const p = (await db.query<{ name: string | null; phone_country: string | null; phone: string | null; answers: Answers }>(
      `DELETE FROM pending_signups WHERE email = $1 AND created_at > now() - interval '1 day' RETURNING name, phone_country, phone, answers`, [email],
    )).rows[0]
    if (!p) return
    const u = (await db.query<{ verified: boolean }>(`SELECT email_verified_at IS NOT NULL AS verified FROM users WHERE id = $1 FOR UPDATE`, [userId])).rows[0]
    if (!u) return
    if (u.verified) {
      await db.query(`UPDATE users SET name = coalesce(name, $2), phone_country = coalesce(phone_country, $3), phone = coalesce(phone, $4), updated_at = now() WHERE id = $1`, [userId, p.name, p.phone_country, p.phone])
    } else {
      await db.query(`UPDATE users SET name = coalesce($2, name), phone_country = coalesce($3, phone_country), phone = coalesce($4, phone), consent = true, consent_at = now(), updated_at = now() WHERE id = $1`, [userId, p.name, p.phone_country, p.phone])
    }
    const cur = (await db.query<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1 FOR UPDATE`, [userId])).rows[0]?.answers ?? {}
    const next = u.verified ? mergeAnswers(cur, p.answers) : { ...cur, ...p.answers }
    await db.query(`INSERT INTO assessments (user_id, answers) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()`, [userId, JSON.stringify(next)])
  })
  // Old held sign-ups that were never verified.
  if (Math.random() < 0.05) await queryOne(`DELETE FROM pending_signups WHERE created_at < now() - interval '2 days'`).catch(() => null)
}
