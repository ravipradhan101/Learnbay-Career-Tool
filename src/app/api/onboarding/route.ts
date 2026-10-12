import { getCurrentUser } from '@/lib/auth'
import { queryOne, transaction } from '@/lib/db'
import { cleanText, clientIp, isSameOrigin, jsonError, jsonOk, normalizeEmail, rateLimits, readJson } from '@/lib/security'
import { mergeAnswers, sanitizeAnswers, validateContact } from '@/lib/validation'
import { getTool } from '@/lib/tools-meta'
import type { Answers } from '@/lib/questions'
import { crmNewLead } from '@/lib/crm/hooks'
import { emailProblem } from '@/lib/email-check'

const SOURCE_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landing'] as const

function sanitizeSource(input: unknown): Record<string, string> {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const key of SOURCE_KEYS) {
    const value = cleanText(src[key], 200)
    if (value) out[key] = value
  }
  return out
}

/** Where to land after onboarding: a requested tool, the sessions page, or the dashboard. */
function landing(next: unknown): string {
  if (next === 'sessions') return '/dashboard/sessions'
  const tool = typeof next === 'string' ? getTool(next) : undefined
  return tool ? tool.route : '/dashboard'
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  if (!(await rateLimits([['onboard:global', 5000, 600]]))) return jsonError(429, 'We’re very busy right now. Please try again in a few minutes.')
  const body = await readJson<{ answers?: unknown; contact?: unknown; source?: unknown; next?: unknown; replaces?: unknown }>(request)
  if (!body) return jsonError(400, 'Invalid request.')

  const answers = sanitizeAnswers(body.answers)
  if (!answers.experience || !answers.interest) {
    return jsonError(400, 'Please answer the quick questions first.')
  }
  const current = await getCurrentUser()
  const contactInput = { ...(body.contact as Record<string, unknown> | undefined) }
  if (current) contactInput.email = current.email
  const { contact, error } = validateContact(contactInput)
  if (!contact) return jsonError(400, error ?? 'Please check your details.')
  // New sign-ups only (the call after the code is verified is the same person): rules against bulk and fake sign-ups.
  if (!current) {
    // 1. A hidden field people never see, and a form filled faster than a person can type: a script, not a learner.
    const raw = body.contact as Record<string, unknown> | undefined
    const tookMs = Number(raw?.tookMs)
    if ((typeof raw?.website === 'string' && raw.website.trim()) || !Number.isFinite(tookMs) || tookMs < 1500) {
      return jsonError(400, 'Something went wrong. Please try again.')
    }
    // 2. Per network: 20 an hour and 60 a day (a classroom on one Wi-Fi still fits).
    const ip = clientIp(request)
    if (!(await rateLimits([[`onboard:ip:${ip}`, 20, 3600], [`onboard:ip:day:${ip}`, 60, 86_400]]))) {
      return jsonError(429, 'Too many sign-ups from this network. Please try again later.')
    }
    // 3. A real, reachable inbox: no temporary inboxes, test domains, typos or unusual domain endings.
    const problem = await emailProblem(contact.email)
    if (problem) return jsonError(400, problem, { field: 'email' })
    // The learner typed the wrong email and is fixing it before the code step: the sign-up they never confirmed goes,
    // so it is not left behind as a lead nobody can reach and does not count against their phone number. Only an
    // unconfirmed sign-up from the last hour with this same phone number, so nobody can remove someone else's account.
    const replaces = normalizeEmail(body.replaces)
    if (replaces && replaces !== contact.email) {
      await queryOne(
        `DELETE FROM users WHERE email = $1 AND phone = $2 AND phone_country = $3 AND email_verified_at IS NULL AND last_login_at IS NULL
           AND created_at > now() - interval '1 hour'`,
        [replaces, contact.phone, contact.phoneCountry],
      )
      await queryOne(`DELETE FROM pending_signups WHERE email = $1 AND phone = $2 AND phone_country = $3`, [replaces, contact.phone, contact.phoneCountry])
    }
    // 4. One phone number, at most 3 accounts in 30 days.
    const others = await queryOne<{ n: number }>(
      `SELECT count(DISTINCT email)::int AS n FROM (
         SELECT email FROM users WHERE phone = $1 AND phone_country = $2 AND created_at > now() - interval '30 days'
         UNION SELECT email FROM pending_signups WHERE phone = $1 AND phone_country = $2 AND created_at > now() - interval '30 days'
       ) x WHERE email <> $3`,
      [contact.phone, contact.phoneCountry, contact.email],
    )
    if ((others?.n ?? 0) >= 3) return jsonError(400, 'This phone number is already linked to other accounts. Please log in with your existing email, or use your own number.', { field: 'phone' })
  }

  if (!current) {
    // New learner: the lead (contact + answers) is saved straight away, but the account only opens after the
    // learner proves the email is theirs with a 6-digit code (sent by /api/auth/request-otp).
    // An email that already exists is never changed here (anyone could type someone else's email): what they sent is
    // held in pending_signups and applied by /api/auth/verify-otp once the code proves the email is theirs.
    const source = JSON.stringify(sanitizeSource(body.source))
    const saved = await queryOne<{ id: string }>(
      `WITH u AS (
         INSERT INTO users (email, name, phone_country, phone, consent, consent_at, source)
         VALUES ($1, $2, $3, $4, true, now(), $5)
         ON CONFLICT (email) DO NOTHING
         RETURNING id
       ), a AS (
         INSERT INTO assessments (user_id, answers) SELECT id, $6 FROM u
         ON CONFLICT (user_id) DO NOTHING
         RETURNING user_id
       )
       SELECT id FROM u`,
      [contact.email, contact.name, contact.phoneCountry, contact.phone, source, JSON.stringify(answers)],
    )
    if (saved) crmNewLead(saved.id)
    else {
      await queryOne(
        `INSERT INTO pending_signups (email, name, phone_country, phone, answers, source) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone_country = EXCLUDED.phone_country, phone = EXCLUDED.phone,
           answers = EXCLUDED.answers, source = EXCLUDED.source, created_at = now()`,
        [contact.email, contact.name, contact.phoneCountry, contact.phone, JSON.stringify(answers), source],
      )
    }
    // The same answer either way, so nobody can tell from it whether an email has an account.
    return jsonOk({ needsOtp: true, email: contact.email })
  }

  // Signed-in learner finishing onboarding (e.g. logged in first): fill in what is missing.
  const userId = current.id
  await transaction(async (db) => {
    await db.query(
      `UPDATE users SET name = COALESCE(name, $2), phone_country = COALESCE(phone_country, $3), phone = COALESCE(phone, $4),
              consent = true, consent_at = COALESCE(consent_at, now()),
              source = CASE WHEN source = '{}'::jsonb THEN $5::jsonb ELSE source END, updated_at = now()
        WHERE id = $1`,
      [userId, contact.name, contact.phoneCountry, contact.phone, JSON.stringify(sanitizeSource(body.source))],
    )
    const existing = await db.query<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1 FOR UPDATE`, [userId])
    const merged = mergeAnswers(existing.rows[0]?.answers ?? {}, answers)
    await db.query(
      `INSERT INTO assessments (user_id, answers) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()`,
      [userId, JSON.stringify(merged)],
    )
  })
  return jsonOk({ redirect: landing(body.next) })
}
