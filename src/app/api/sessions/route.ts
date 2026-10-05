import { getCurrentUser } from '@/lib/auth'
import { query, queryOne, transaction } from '@/lib/db'
import type { PoolClient } from 'pg'
import { triggerFlows } from '@/lib/email/flows'
import { sendSessionEmails } from '@/lib/mailer'
import { experienceLabel, interestLabel, roleLabel, type Answers } from '@/lib/questions'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import {
  BOOKING_DAYS, SESSION_SHORT, SESSION_TIMES, SESSION_TYPE_ID, SLOT_CAPACITY, istDate, slotOpen, whenLabel, type Booking, type DaySlots,
} from '@/lib/sessions'

// Free calls with a Senior Career Counsellor: today or tomorrow only, one hour slots from 10 AM to 7 PM IST,
// at most SLOT_CAPACITY learners per slot. A learner has one active booking, which they can reschedule (not cancel).

type Row = { id: string; preferred_date: string; preferred_time: string; status: string; rescheduled: number }

/** The learner's upcoming booking (today or later, not closed). */
async function activeBooking(userId: string): Promise<Booking | null> {
  const r = await queryOne<Row>(
    `SELECT id, to_char(preferred_date, 'YYYY-MM-DD') AS preferred_date, preferred_time, status, rescheduled
       FROM counsellor_requests
      WHERE user_id = $1 AND status <> 'closed' AND preferred_date >= $2::date AND preferred_time IS NOT NULL
      ORDER BY created_at DESC LIMIT 1`,
    [userId, istDate()],
  )
  return r ? { id: r.id, date: r.preferred_date, time: r.preferred_time, when: whenLabel(r.preferred_date, r.preferred_time), status: r.status, rescheduled: r.rescheduled } : null
}

/** Today and tomorrow, each slot with how many places are left (full or past slots are not open). */
async function availability(excludeId?: string): Promise<DaySlots[]> {
  const dates = Array.from({ length: BOOKING_DAYS }, (_, i) => istDate(i))
  const taken = await query<{ d: string; t: string; n: number }>(
    `SELECT to_char(preferred_date, 'YYYY-MM-DD') AS d, preferred_time AS t, count(*)::int AS n
       FROM counsellor_requests
      WHERE preferred_date = ANY($1::date[]) AND status <> 'closed' AND ($2::uuid IS NULL OR id <> $2::uuid)
      GROUP BY 1, 2`,
    [dates, excludeId ?? null],
  )
  const count = (d: string, t: string) => taken.find((x) => x.d === d && x.t === t)?.n ?? 0
  return dates.map((date, i) => ({
    date,
    label: i === 0 ? 'Today' : 'Tomorrow',
    slots: SESSION_TIMES.map((time) => {
      const left = Math.max(0, SLOT_CAPACITY - count(date, time))
      return { time, left, open: left > 0 && slotOpen(date, time) }
    }),
  }))
}

/** Checks a requested date and time against the rules and the slot's capacity. */
async function checkSlot(body: { date?: unknown; time?: unknown } | null, excludeId?: string): Promise<{ date: string; time: string } | { error: string }> {
  const time = SESSION_TIMES.find((t) => t === body?.time)
  const date = typeof body?.date === 'string' ? body.date : ''
  if (!time) return { error: 'Please choose a time.' }
  if (date !== istDate(0) && date !== istDate(1)) return { error: 'Calls can be booked for today or tomorrow only.' }
  if (!slotOpen(date, time)) return { error: 'That time has passed. Please pick a later slot.' }
  const days = await availability(excludeId)
  const slot = days.find((d) => d.date === date)?.slots.find((s) => s.time === time)
  if (!slot || slot.left <= 0) return { error: 'That slot just filled up. Please pick another time.' }
  return { date, time }
}

/**
 * Holds the slot while counting and saving, so two learners taking the last place at the same moment can never
 * push a slot past SLOT_CAPACITY. Returns false when the slot is full.
 */
async function slotHasRoom(client: PoolClient, date: string, time: string, excludeId?: string): Promise<boolean> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`slot:${date}:${time}`])
  const r = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM counsellor_requests
      WHERE preferred_date = $1::date AND preferred_time = $2 AND status <> 'closed' AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [date, time, excludeId ?? null],
  )
  return (r.rows[0]?.n ?? 0) < SLOT_CAPACITY
}

async function profileSummary(userId: string) {
  const ctx = await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [userId])
  return ctx ? `${roleLabel(ctx.answers)}, ${experienceLabel(ctx.answers)}, interested in ${interestLabel(ctx.answers)}` : 'Not available'
}

/** The learner's booking (if any) and the open slots. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const booking = await activeBooking(user.id)
  return jsonOk({ booking, days: await availability(booking?.id) })
}

/** Books a call. With a booking already in place, the learner reschedules it instead. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!user.phone) return jsonError(400, 'Please complete the quick start first.', { redirect: '/start?tool=sessions' })
  const existing = await activeBooking(user.id)
  if (existing) return jsonError(409, `Your call is already booked for ${existing.when}. You can reschedule it instead.`, { booking: existing })
  if (!(await rateLimit(`session:user:${user.id}`, 6, 24 * 60 * 60))) return jsonError(429, 'We already have your booking. A Senior Counsellor will call you as scheduled.')
  const body = await readJson<{ date?: unknown; time?: unknown; note?: unknown }>(request, 4_000)
  const slot = await checkSlot(body)
  if ('error' in slot) return jsonError(400, slot.error)
  const note = cleanText(body?.note, 500)
  const created = await transaction(async (client) => {
    if (!(await slotHasRoom(client, slot.date, slot.time))) return null
    const r = await client.query<{ id: string }>(
      `INSERT INTO counsellor_requests (user_id, session_type, preferred_date, preferred_time, preferred_slot, note)
       VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
      [user.id, SESSION_TYPE_ID, slot.date, slot.time, note || null],
    )
    return r.rows[0] ?? null
  })
  if (!created) return jsonError(409, 'That slot just filled up. Please pick another time.')
  triggerFlows(user.id, 'session_booked')
  const when = whenLabel(slot.date, slot.time)
  try {
    await sendSessionEmails({ learner: { id: user.id, name: user.name ?? user.email, email: user.email, phone: `${user.phone_country ?? ''} ${user.phone}`.trim() }, type: SESSION_SHORT, when, note, summary: await profileSummary(user.id) })
  } catch (err) {
    console.error('[sessions] email failed', (err as Error).message)
  }
  const booking = await activeBooking(user.id)
  return jsonOk({ id: created?.id, when, booking, message: `Booked for ${when}. A Senior Counsellor will call you then.` })
}

/** Moves the learner's booking to another open slot (there is no cancelling). */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const existing = await activeBooking(user.id)
  if (!existing) return jsonError(404, 'You don’t have a call booked yet.')
  if (!(await rateLimit(`session:resched:${user.id}`, 5, 24 * 60 * 60))) return jsonError(429, 'You’ve rescheduled a few times today. A Senior Counsellor will call you at your current time.')
  const body = await readJson<{ date?: unknown; time?: unknown }>(request, 2_000)
  const slot = await checkSlot(body, existing.id)
  if ('error' in slot) return jsonError(400, slot.error)
  if (slot.date === existing.date && slot.time === existing.time) return jsonOk({ booking: existing, when: existing.when })
  const moved = await transaction(async (client) => {
    if (!(await slotHasRoom(client, slot.date, slot.time, existing.id))) return false
    await client.query(
      `UPDATE counsellor_requests SET preferred_date = $2, preferred_time = $3, preferred_slot = $3, status = 'new', rescheduled = rescheduled + 1 WHERE id = $1`,
      [existing.id, slot.date, slot.time],
    )
    return true
  })
  if (!moved) return jsonError(409, 'That slot just filled up. Please pick another time.')
  const when = whenLabel(slot.date, slot.time)
  try {
    await sendSessionEmails({ learner: { id: user.id, name: user.name ?? user.email, email: user.email, phone: `${user.phone_country ?? ''} ${user.phone}`.trim() }, type: SESSION_SHORT, when, note: '', summary: await profileSummary(user.id), rescheduledFrom: existing.when })
  } catch (err) {
    console.error('[sessions] reschedule email failed', (err as Error).message)
  }
  return jsonOk({ booking: await activeBooking(user.id), when, message: `Moved to ${when}. A Senior Counsellor will call you then.` })
}
