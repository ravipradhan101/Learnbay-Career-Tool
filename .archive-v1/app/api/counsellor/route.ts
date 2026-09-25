import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { sendCounsellorEmails } from '@/lib/mailer'
import { roleLabel, experienceLabel, industryLabel, type Answers } from '@/lib/questions'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { COUNSELLOR_SLOTS } from '@/lib/counsellor'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`counsellor:user:${user.id}`, 3, 24 * 60 * 60))) {
    return jsonError(429, 'We already have your request. A counselor will reach out soon.')
  }
  const body = await readJson<{ date?: unknown; slot?: unknown; note?: unknown }>(request, 4_000)
  const slot = COUNSELLOR_SLOTS.find((s) => s.id === body?.slot)
  if (!slot) return jsonError(400, 'Please choose a preferred time.')

  let date: string | null = null
  if (typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    const d = new Date(`${body.date}T00:00:00Z`)
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
    const diffDays = (d.getTime() - today.getTime()) / 86_400_000
    if (Number.isNaN(d.getTime()) || diffDays < 0 || diffDays > 14) return jsonError(400, 'Please choose a date within the next two weeks.')
    date = body.date
  }
  const note = cleanText(body?.note, 500)

  if (!user.phone) return jsonError(400, 'Please complete your profile first.')
  const created = await queryOne<{ id: string }>(
    `INSERT INTO counsellor_requests (user_id, preferred_date, preferred_slot, note) VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.id, date, slot.id, note || null],
  )

  const ctx = await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [user.id])
  const summary = ctx ? `${roleLabel(ctx.answers)}, ${experienceLabel(ctx.answers)}, ${industryLabel(ctx.answers)}` : 'Not available'
  const when = `${date ?? 'any day'}, ${slot.label}`
  try {
    await sendCounsellorEmails({
      learner: { name: user.name ?? user.email, email: user.email, phone: `${user.phone_country ?? ''} ${user.phone}`.trim() },
      when,
      note,
      summary,
    })
  } catch (err) {
    console.error('[counsellor] email failed', (err as Error).message)
  }
  return jsonOk({ id: created?.id, message: 'Request received. A counselor will call you at your preferred time.' })
}
