import { createSession, findUserByEmail, getCurrentUser } from '@/lib/auth'
import { query, queryOne, transaction } from '@/lib/db'
import { cleanText, clientIp, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { sanitizeAnswers, validateContact } from '@/lib/validation'

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

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  if (!(await rateLimit(`submit:ip:${clientIp(request)}`, 15, 60 * 60))) {
    return jsonError(429, 'Too many submissions from this network. Please try again later.')
  }
  const body = await readJson<{ answers?: unknown; contact?: unknown; source?: unknown }>(request)
  if (!body) return jsonError(400, 'Invalid request.')

  const answers = sanitizeAnswers(body.answers)
  const current = await getCurrentUser()
  const contactInput = { ...(body.contact as Record<string, unknown> | undefined) }
  // A signed-in learner always submits for their own verified email.
  if (current) contactInput.email = current.email
  const { contact, error } = validateContact(contactInput)
  if (!contact) return jsonError(400, error ?? 'Please check your details.')

  let userId: string
  if (current) {
    userId = current.id
  } else {
    const existing = await findUserByEmail(contact.email)
    if (existing) {
      // The email already belongs to an account: prove ownership with a code before continuing.
      return jsonOk({ needsOtp: true, email: contact.email })
    }
    const created = await queryOne<{ id: string }>(
      `INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [contact.email],
    )
    if (!created) return jsonOk({ needsOtp: true, email: contact.email })
    userId = created.id
    await createSession(userId, request)
  }

  const existingReport = await queryOne<{ status: string }>(`SELECT status FROM reports WHERE user_id = $1`, [userId])
  if (existingReport?.status === 'ready') return jsonOk({ alreadyHasReport: true, redirect: '/dashboard' })

  await transaction(async (db) => {
    await db.query(
      `UPDATE users SET name = $2, phone_country = $3, phone = $4, consent = true,
              consent_at = COALESCE(consent_at, now()),
              source = CASE WHEN source = '{}'::jsonb THEN $5::jsonb ELSE source END,
              updated_at = now()
        WHERE id = $1`,
      [userId, contact.name, contact.phoneCountry, contact.phone, JSON.stringify(sanitizeSource(body.source))],
    )
    await db.query(
      `INSERT INTO assessments (user_id, answers) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()`,
      [userId, JSON.stringify(answers)],
    )
    await db.query(`INSERT INTO reports (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId])
  })
  // Partial-lead records for this email are no longer needed once the full assessment exists.
  await query(`DELETE FROM progress_saves WHERE email = $1`, [contact.email])

  return jsonOk({ submitted: true })
}
