import { getCurrentUser } from '@/lib/auth'
import { queryOne, transaction } from '@/lib/db'
import { cleanText, clientIp, isSameOrigin, jsonError, jsonOk, rateLimits, readJson } from '@/lib/security'
import { mergeAnswers, sanitizeAnswers, validateContact } from '@/lib/validation'
import { getTool } from '@/lib/tools-meta'
import type { Answers } from '@/lib/questions'
import { crmNewLead } from '@/lib/crm/hooks'

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
  if (!(await rateLimits([[`onboard:ip:${clientIp(request)}`, 60, 3600], ['onboard:global', 5000, 600]]))) {
    return jsonError(429, 'Too many sign-ups from this network. Please try again later.')
  }
  const body = await readJson<{ answers?: unknown; contact?: unknown; source?: unknown; next?: unknown }>(request)
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

  if (!current) {
    // New learner: the lead (contact + answers) is saved straight away, but the account only opens after the
    // learner proves the email is theirs with a 6-digit code (sent by /api/auth/request-otp).
    // An unverified account (someone who never entered their code) is refreshed with the latest details;
    // a verified account is never touched without its code.
    const saved = await queryOne<{ id: string }>(
      `WITH u AS (
         INSERT INTO users (email, name, phone_country, phone, consent, consent_at, source)
         VALUES ($1, $2, $3, $4, true, now(), $5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone_country = EXCLUDED.phone_country, phone = EXCLUDED.phone,
                consent = true, consent_at = now(), updated_at = now()
          WHERE users.email_verified_at IS NULL
         RETURNING id
       ), a AS (
         INSERT INTO assessments (user_id, answers) SELECT id, $6 FROM u
         ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()
         RETURNING user_id
       )
       SELECT id FROM u`,
      [contact.email, contact.name, contact.phoneCountry, contact.phone, JSON.stringify(sanitizeSource(body.source)), JSON.stringify(answers)],
    )
    // saved = null means a verified account already owns this email.
    if (saved) crmNewLead(saved.id)
    return jsonOk({ needsOtp: true, email: contact.email, existing: !saved })
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
