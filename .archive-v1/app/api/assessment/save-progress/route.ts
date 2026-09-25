import { query } from '@/lib/db'
import { sendResumeProgressEmail } from '@/lib/mailer'
import { clientIp, isSameOrigin, jsonError, jsonOk, normalizeEmail, randomToken, rateLimit, readJson, sha256 } from '@/lib/security'
import { sanitizeAnswers } from '@/lib/validation'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<{ email?: unknown; answers?: unknown; step?: unknown }>(request)
  const email = normalizeEmail(body?.email)
  if (!email) return jsonError(400, 'Please enter a valid email address.')
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`save:ip:${clientIp(request)}`, 10, 60 * 60),
    rateLimit(`save:email:${email}`, 3, 60 * 60),
  ])
  if (!ipOk || !emailOk) return jsonError(429, 'Too many requests. Please try again later.')

  const answers = sanitizeAnswers(body?.answers)
  const step = typeof body?.step === 'number' && Number.isInteger(body.step) ? Math.min(Math.max(body.step, 0), 8) : 0
  const token = randomToken(24)
  await query(
    `INSERT INTO progress_saves (email, answers, step, token_hash, expires_at) VALUES ($1, $2, $3, $4, now() + interval '7 days')`,
    [email, JSON.stringify(answers), step, sha256(token)],
  )
  await query(`DELETE FROM progress_saves WHERE expires_at < now()`)
  try {
    await sendResumeProgressEmail(email, token)
  } catch (err) {
    console.error('[save-progress] email failed', (err as Error).message)
    return jsonError(502, 'We saved your progress but could not send the email. Please try again.')
  }
  return jsonOk({ message: 'Saved. We emailed you a link to continue.' })
}
