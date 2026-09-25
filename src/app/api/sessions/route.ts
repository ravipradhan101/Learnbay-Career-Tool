import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { triggerFlows } from '@/lib/email/flows'
import { sendSessionEmails } from '@/lib/mailer'
import { experienceLabel, interestLabel, roleLabel, type Answers } from '@/lib/questions'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { SESSION_SHORT, SESSION_TIMES, SESSION_TYPE_ID } from '@/lib/sessions'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!user.phone) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start?tool=sessions' })
  if (!(await rateLimit(`session:user:${user.id}`, 4, 24 * 60 * 60))) {
    return jsonError(429, 'We already have your requests for today. Our team will reach out soon.')
  }
  const body = await readJson<{ date?: unknown; time?: unknown; note?: unknown }>(request, 4_000)
  const time = SESSION_TIMES.find((t) => t === body?.time)
  if (!time) return jsonError(400, 'Please choose a time.')
  if (typeof body?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return jsonError(400, 'Please choose a date.')
  const date = new Date(`${body.date}T00:00:00Z`)
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  const days = (date.getTime() - today.getTime()) / 86_400_000
  if (Number.isNaN(date.getTime()) || days < 0 || days > 14) return jsonError(400, 'Please choose a date within the next two weeks.')
  const note = cleanText(body?.note, 500)

  const created = await queryOne<{ id: string }>(
    `INSERT INTO counsellor_requests (user_id, session_type, preferred_date, preferred_time, preferred_slot, note)
     VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
    [user.id, SESSION_TYPE_ID, body.date, time, note || null],
  )
  triggerFlows(user.id, 'session_booked')
  const ctx = await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [user.id])
  const summary = ctx ? `${roleLabel(ctx.answers)}, ${experienceLabel(ctx.answers)}, interested in ${interestLabel(ctx.answers)}` : 'Not available'
  const when = `${new Date(`${body.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at ${time}`
  try {
    await sendSessionEmails({ learner: { id: user.id, name: user.name ?? user.email, email: user.email, phone: `${user.phone_country ?? ''} ${user.phone}`.trim() }, type: SESSION_SHORT, when, note, summary })
  } catch (err) {
    console.error('[sessions] email failed', (err as Error).message)
  }
  return jsonOk({ id: created?.id, when, message: `Requested for ${when}. A Learnbay mentor will confirm and connect with you 1:1.` })
}
