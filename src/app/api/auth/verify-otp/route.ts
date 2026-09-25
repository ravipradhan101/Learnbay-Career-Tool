import { createSession, findOrCreateUser, verifyOtp } from '@/lib/auth'
import { queryOne } from '@/lib/db'
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
