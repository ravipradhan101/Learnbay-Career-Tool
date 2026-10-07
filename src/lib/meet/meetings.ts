import { query, queryOne, transaction } from '../db'
import { env } from '../env'
import { learnerUrl } from '../links'
import { sendMail } from '../mailer'
import { cancelMeetEvent, createMeetEvent } from './google'

/**
 * Meetings between a learner and one staff member: video (Google Meet) or phone. Every meeting is 30 minutes unless
 * staff choose otherwise, and a host can never have two at the same time (checked here under a lock, and enforced
 * by the database's exclusion constraint as a last line).
 */
export const MEETING_MINUTES = 30
/** "Connect now" meetings start this long from the moment the learner says yes. */
export const CONNECT_LEAD_MINUTES = 30
const DAY_START = 10 * 60
const DAY_END = 20 * 60
const IST = '+05:30'

export type Meeting = {
  id: string; user_id: string; host_id: string; mode: 'video' | 'phone'; kind: 'instant' | 'scheduled'; starts_at: Date; ends_at: Date
  meet_url: string | null; calendar_event_id: string | null; status: string; requested_by: 'user' | 'staff'; note: string | null
}
export type MeetingView = { id: string; mode: 'video' | 'phone'; startsAt: string; endsAt: string; when: string; meetUrl: string | null; host: string; status: string }

// ---------- Time (IST) ----------

const istDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const istMinute = (d: Date) => (((Math.floor(d.getTime() / 60_000) + 330) % 1440) + 1440) % 1440
const at = (day: string, minutes: number) => new Date(`${day}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00${IST}`)
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000)
export function whenText(d: Date | string): string {
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\b(am|pm)\b/, (m) => m.toUpperCase())
}
const timeText = (d: Date) => d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\b(am|pm)\b/, (m) => m.toUpperCase())
/** Within calling hours: starts at 10 AM or later and ends by 8 PM IST, on one day. */
const inHours = (start: Date, minutes: number) => istDay(start) === istDay(addMin(start, minutes - 1)) && istMinute(start) >= DAY_START && istMinute(start) + minutes <= DAY_END

// ---------- Who is free ----------

type Block = [number, number]
/** Everything that keeps these people busy between `from` and `to`: meetings, booked calls and follow-up calls they own. */
async function busyBlocks(ids: string[], from: Date, to: Date): Promise<Map<string, Block[]>> {
  const rows = ids.length ? await query<{ host: string; s: Date; e: Date }>(
    `SELECT host_id AS host, starts_at AS s, ends_at AS e FROM meetings
      WHERE host_id = ANY($1::uuid[]) AND status = 'scheduled' AND starts_at < $3 AND ends_at > $2
     UNION ALL
     SELECT owner_id, due_at, due_at + make_interval(mins => $4) FROM lead_tasks
      WHERE owner_id = ANY($1::uuid[]) AND status = 'open' AND kind IN ('call_booked', 'follow_up')
        AND due_at < $3 AND due_at + make_interval(mins => $4) > $2`,
    [ids, from, to, MEETING_MINUTES],
  ) : []
  const map = new Map<string, Block[]>()
  for (const r of rows) map.set(r.host, [...(map.get(r.host) ?? []), [new Date(r.s).getTime(), new Date(r.e).getTime()]])
  return map
}
const freeIn = (blocks: Block[] | undefined, start: Date, end: Date) => !(blocks ?? []).some(([s, e]) => s < end.getTime() && e > start.getTime())

/**
 * Who can take a learner's meeting, in order: their own ISM (if they have one and are active), then every active ISM
 * in the round robin, the one who was given a meeting longest ago first.
 */
async function learnerHosts(userId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT a.id FROM admin_users a
      WHERE a.role = 'ism' AND a.active
        AND (a.in_rotation OR a.id = (SELECT owner_id FROM lead_owners WHERE user_id = $1))
      ORDER BY (a.id = (SELECT owner_id FROM lead_owners WHERE user_id = $1)) DESC NULLS LAST,
               (SELECT max(created_at) FROM meetings m WHERE m.host_id = a.id) ASC NULLS FIRST, a.rr_last_assigned_at ASC NULLS FIRST`,
    [userId],
  )
  return rows.map((r) => r.id)
}

export type Availability = {
  enabled: boolean
  now: { startsAt: string; label: string } | null
  days: { date: string; label: string; slots: { startsAt: string; time: string; open: boolean; passed: boolean }[] }[]
}

/** What a learner can book: "connect now" (in 30 minutes) and 30-minute slots today and tomorrow. */
export async function availability(userId: string, nowTime = new Date()): Promise<Availability> {
  const hosts = await learnerHosts(userId)
  if (!hosts.length) return { enabled: false, now: null, days: [] }
  const today = istDay(nowTime)
  const tomorrow = istDay(addMin(at(today, 12 * 60), 24 * 60))
  const busy = await busyBlocks(hosts, nowTime, at(tomorrow, DAY_END))
  const anyFree = (start: Date) => hosts.some((h) => freeIn(busy.get(h), start, addMin(start, MEETING_MINUTES)))
  const soonest = nextConnectTime(nowTime)
  const now = inHours(soonest, MEETING_MINUTES) && anyFree(soonest) ? { startsAt: soonest.toISOString(), label: timeText(soonest) } : null
  const earliest = addMin(nowTime, CONNECT_LEAD_MINUTES).getTime()
  const days = [today, tomorrow].map((date, i) => ({
    date,
    label: i ? 'Tomorrow' : 'Today',
    slots: Array.from({ length: (DAY_END - DAY_START) / MEETING_MINUTES }, (_, k) => {
      const start = at(date, DAY_START + k * MEETING_MINUTES)
      const passed = start.getTime() < earliest
      return { startsAt: start.toISOString(), time: timeText(start), open: !passed && anyFree(start), passed }
    }),
  }))
  return { enabled: true, now, days }
}

/** 30 minutes from now, rounded up to the next 5 minutes. */
function nextConnectTime(nowTime: Date) {
  const t = addMin(nowTime, CONNECT_LEAD_MINUTES).getTime()
  return new Date(Math.ceil(t / 300_000) * 300_000)
}

// ---------- Creating meetings ----------

type Created = { ok: true; meeting: MeetingView } | { ok: false; status: number; error: string; next?: { startsAt: string; label: string } | null }

async function view(id: string): Promise<MeetingView | null> {
  const m = await queryOne<Meeting & { host_name: string | null; host_email: string }>(
    `SELECT m.*, a.name AS host_name, a.email AS host_email FROM meetings m JOIN admin_users a ON a.id = m.host_id WHERE m.id = $1`,
    [id],
  )
  if (!m) return null
  return {
    id: m.id, mode: m.mode, startsAt: new Date(m.starts_at).toISOString(), endsAt: new Date(m.ends_at).toISOString(), when: whenText(m.starts_at),
    meetUrl: m.meet_url, host: (m.host_name ?? m.host_email.split('@')[0]).split(' ')[0], status: m.status,
  }
}

/** The learner's next meeting that has not ended, if any. */
export async function upcomingFor(userId: string): Promise<MeetingView | null> {
  const r = await queryOne<{ id: string }>(`SELECT id FROM meetings WHERE user_id = $1 AND status = 'scheduled' AND ends_at > now() ORDER BY starts_at LIMIT 1`, [userId])
  return r ? view(r.id) : null
}

/**
 * Inserts the meeting for the first free host (inside one lock, so two requests can never take the same person's
 * time), with its task for the host. A lead with no owner yet becomes the host's lead.
 */
async function insertMeeting(m: { userId: string; hosts: string[]; start: Date; minutes: number; mode: 'video' | 'phone'; kind: 'instant' | 'scheduled'; by: 'user' | 'staff'; createdBy: string | null; source: string; note: string | null }): Promise<string | null> {
  const end = addMin(m.start, m.minutes)
  return transaction(async (db) => {
    await db.query(`SELECT pg_advisory_xact_lock(hashtext('meet:alloc'))`)
    const busy = await busyBlocks(m.hosts, m.start, end)
    for (const host of m.hosts) {
      if (!freeIn(busy.get(host), m.start, end)) continue
      await db.query('SAVEPOINT try_host')
      try {
        const row = (await db.query<{ id: string }>(
          `INSERT INTO meetings (user_id, host_id, mode, kind, starts_at, ends_at, requested_by, created_by, source, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [m.userId, host, m.mode, m.kind, m.start, end, m.by, m.createdBy, m.source, m.note],
        )).rows[0]
        await db.query(
          `INSERT INTO lead_tasks (user_id, owner_id, kind, title, due_at, missed_at, source_id, created_by)
           VALUES ($1, $2, 'meeting', $3, $4, $5, $6, $7)`,
          [m.userId, host, `${m.mode === 'video' ? 'Google Meet video call' : 'Phone call'}${m.kind === 'instant' ? ' (learner asked to connect now)' : ''}`, m.start, addMin(m.start, 60), row.id, m.createdBy],
        )
        const owned = await db.query(
          `INSERT INTO lead_owners (user_id, owner_id, source) VALUES ($1, $2, 'round_robin')
           ON CONFLICT (user_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, assigned_at = now(), updated_at = now() WHERE lead_owners.owner_id IS NULL
           RETURNING user_id`,
          [m.userId, host],
        )
        if (owned.rowCount) {
          await db.query(`INSERT INTO lead_assignments (user_id, to_id, source) VALUES ($1, $2, 'round_robin')`, [m.userId, host])
          await db.query(`INSERT INTO lead_activities (user_id, actor_kind, action, detail) VALUES ($1, 'system', 'allocated', $2)`, [m.userId, JSON.stringify({ to: host, source: 'round_robin', via: 'meeting' })])
        }
        await db.query('RELEASE SAVEPOINT try_host')
        return row.id
      } catch (err) {
        await db.query('ROLLBACK TO SAVEPOINT try_host')
        if ((err as { code?: string }).code !== '23P01') throw err // 23P01 = would overlap (the constraint), try the next host
      }
    }
    return null
  })
}

/** Gives the meeting its Google Meet link (a new Meet room through Google Calendar, else the host's own room), then emails both. */
async function finish(id: string): Promise<MeetingView | null> {
  const m = await queryOne<Meeting & { host_email: string; host_name: string | null; host_meet: string | null; email: string; name: string | null; phone: string | null }>(
    `SELECT m.*, a.email AS host_email, a.name AS host_name, a.meet_url AS host_meet, u.email, u.name, coalesce(u.phone_country, '') || ' ' || coalesce(u.phone, '') AS phone
       FROM meetings m JOIN admin_users a ON a.id = m.host_id JOIN users u ON u.id = m.user_id WHERE m.id = $1`,
    [id],
  )
  if (!m) return null
  if (m.mode === 'video') {
    const ev = await createMeetEvent({
      hostEmail: m.host_email, summary: `Learnbay: career call with ${m.name ?? m.email}`,
      description: `Learnbay Career Studio video call.\nLearner: ${m.name ?? ''} (${m.email})\nCRM: ${env.appUrl}/admin/crm/leads/${m.user_id}`,
      start: new Date(m.starts_at), end: new Date(m.ends_at), attendees: [m.email],
    })
    const url = ev?.meetUrl ?? m.host_meet
    if (url) await query(`UPDATE meetings SET meet_url = $2, calendar_event_id = $3, updated_at = now() WHERE id = $1`, [id, url, ev ? `${ev.organizer}|${ev.eventId}` : null])
  }
  const v = await view(id)
  if (v) await meetingEmails(v, { id: m.user_id, email: m.email, name: m.name, phone: m.phone?.trim() || null }, { id: m.host_id, email: m.host_email, name: m.host_name }, 'booked')
  return v
}

/** A learner asks for a meeting: now (in 30 minutes) or at an open slot. */
export async function bookForLearner(userId: string, b: { now?: unknown; startsAt?: unknown; source?: unknown }): Promise<Created> {
  if (await upcomingFor(userId)) return { ok: false, status: 409, error: 'You already have a video call booked.' }
  const hosts = await learnerHosts(userId)
  if (!hosts.length) return { ok: false, status: 409, error: 'Video calls with our experts are not open yet. Please book a phone call instead.' }
  const nowTime = new Date()
  const start = b.now === true ? nextConnectTime(nowTime) : new Date(String(b.startsAt ?? ''))
  if (Number.isNaN(start.getTime())) return { ok: false, status: 400, error: 'Pick a time.' }
  if (b.now !== true && (start.getTime() < addMin(nowTime, CONNECT_LEAD_MINUTES - 1).getTime() || start.getTime() > addMin(nowTime, 3 * 24 * 60).getTime() || istMinute(start) % MEETING_MINUTES !== 0)) {
    return { ok: false, status: 400, error: 'That time is not available. Please pick another.' }
  }
  if (!inHours(start, MEETING_MINUTES)) {
    const a = await availability(userId, nowTime)
    const next = a.days.flatMap((d) => d.slots).find((s) => s.open)
    return { ok: false, status: 409, error: `Our experts take video calls between 10 AM and 8 PM IST.`, next: next ? { startsAt: next.startsAt, label: `${whenText(next.startsAt)}` } : null }
  }
  const source = typeof b.source === 'string' ? b.source.slice(0, 40) : 'chat'
  const id = await insertMeeting({ userId, hosts, start, minutes: MEETING_MINUTES, mode: 'video', kind: b.now === true ? 'instant' : 'scheduled', by: 'user', createdBy: null, source, note: null })
  if (!id) {
    const a = await availability(userId, nowTime)
    const next = a.days.flatMap((d) => d.slots).find((s) => s.open && new Date(s.startsAt) > start)
    return { ok: false, status: 409, error: 'All our experts are on calls at that time.', next: next ? { startsAt: next.startsAt, label: whenText(next.startsAt) } : null }
  }
  await query(`INSERT INTO lead_events (user_id, type, detail) VALUES ($1, 'meeting_booked', $2)`, [userId, JSON.stringify({ kind: b.now === true ? 'instant' : 'scheduled', source })])
  const meeting = await finish(id)
  return meeting ? { ok: true, meeting } : { ok: false, status: 500, error: 'Could not save the meeting.' }
}

/** Staff book a meeting with a lead, for themselves or someone they may assign work to (checked by the caller). */
export async function bookByStaff(createdBy: string, userId: string, b: { hostId: string; startsAt: unknown; minutes?: unknown; mode?: unknown; note?: unknown }): Promise<Created> {
  const start = new Date(String(b.startsAt ?? ''))
  if (Number.isNaN(start.getTime())) return { ok: false, status: 400, error: 'Choose a date and time.' }
  if (start.getTime() < Date.now() + 5 * 60_000 || start.getTime() > Date.now() + 60 * 86_400_000) return { ok: false, status: 400, error: 'Pick a time from 5 minutes to 60 days ahead.' }
  const minutes = [15, 30, 45, 60].includes(Number(b.minutes)) ? Number(b.minutes) : MEETING_MINUTES
  const m = istMinute(start)
  if (m < 9 * 60 || m + minutes > 21 * 60) return { ok: false, status: 400, error: 'Meetings can be between 9 AM and 9 PM IST.' }
  const mode = b.mode === 'phone' ? 'phone' : 'video'
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) || null : null
  const id = await insertMeeting({ userId, hosts: [b.hostId], start, minutes, mode, kind: 'scheduled', by: 'staff', createdBy, source: 'crm', note })
  if (!id) {
    const clash = await queryOne<{ s: Date; e: Date }>(
      `SELECT starts_at AS s, ends_at AS e FROM meetings WHERE host_id = $1 AND status = 'scheduled' AND starts_at < $3 AND ends_at > $2 ORDER BY starts_at LIMIT 1`,
      [b.hostId, start, addMin(start, minutes)],
    )
    return { ok: false, status: 409, error: clash ? `That clashes with another meeting (${timeText(new Date(clash.s))}–${timeText(new Date(clash.e))}). Pick another time.` : 'That clashes with a booked call at the same time. Pick another time.' }
  }
  const meeting = await finish(id)
  return meeting ? { ok: true, meeting } : { ok: false, status: 500, error: 'Could not save the meeting.' }
}

async function loadFull(meetingId: string, userId: string) {
  return queryOne<Meeting & { host_email: string; host_name: string | null; email: string; name: string | null; phone: string | null }>(
    `SELECT m.*, a.email AS host_email, a.name AS host_name, u.email, u.name, coalesce(u.phone_country, '') || ' ' || coalesce(u.phone, '') AS phone
       FROM meetings m JOIN admin_users a ON a.id = m.host_id JOIN users u ON u.id = m.user_id WHERE m.id = $1 AND m.user_id = $2`,
    [meetingId, userId],
  )
}

export async function cancelMeeting(meetingId: string, userId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const m = await loadFull(meetingId, userId)
  if (!m || m.status !== 'scheduled') return { ok: false, error: 'This meeting is not scheduled.' }
  await transaction(async (db) => {
    await db.query(`UPDATE meetings SET status = 'cancelled', cancel_reason = $2, updated_at = now() WHERE id = $1`, [m.id, reason || null])
    await db.query(`UPDATE lead_tasks SET status = 'cancelled' WHERE kind = 'meeting' AND source_id = $1 AND status = 'open'`, [m.id])
  })
  if (m.calendar_event_id) {
    const [organizer, eventId] = m.calendar_event_id.split('|')
    await cancelMeetEvent(organizer, eventId)
  }
  const v = await view(m.id)
  if (v) await meetingEmails(v, { id: m.user_id, email: m.email, name: m.name, phone: m.phone?.trim() || null }, { id: m.host_id, email: m.host_email, name: m.host_name }, 'cancelled', reason)
  return { ok: true }
}

export async function setMeetingLink(meetingId: string, userId: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const m = await loadFull(meetingId, userId)
  if (!m || m.status !== 'scheduled' || m.mode !== 'video') return { ok: false, error: 'This meeting can’t take a link.' }
  await query(`UPDATE meetings SET meet_url = $2, updated_at = now() WHERE id = $1`, [m.id, url])
  const v = await view(m.id)
  if (v) await meetingEmails(v, { id: m.user_id, email: m.email, name: m.name, phone: m.phone?.trim() || null }, { id: m.host_id, email: m.host_email, name: m.host_name }, 'link')
  return { ok: true }
}

/** Closing the host's task closes the meeting: held, or a no-show. */
export async function closeMeetingFromTask(db: { query: (sql: string, p: unknown[]) => Promise<unknown> }, meetingId: string, outcome: string) {
  await db.query(`UPDATE meetings SET status = $2, updated_at = now() WHERE id = $1 AND status = 'scheduled'`, [meetingId, outcome === 'no_answer' ? 'no_show' : 'completed'])
}

// ---------- Emails ----------

function ics(v: MeetingView, title: string, description: string): Buffer {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  return Buffer.from([
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Learnbay//Career Studio//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${v.id}@learnbay-career-studio`, `DTSTAMP:${fmt(new Date().toISOString())}`, `DTSTART:${fmt(v.startsAt)}`, `DTEND:${fmt(v.endsAt)}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(description)}`, ...(v.meetUrl ? [`LOCATION:${v.meetUrl}`, `URL:${v.meetUrl}`] : []),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n'))
}

/** The learner and the host each get the details (and a calendar file). Email failures never undo a booking. */
async function meetingEmails(v: MeetingView, learner: { id: string; email: string; name: string | null; phone: string | null }, host: { id: string; email: string; name: string | null }, what: 'booked' | 'cancelled' | 'link', reason = '') {
  const first = (learner.name ?? '').split(' ')[0] || 'there'
  const how = v.mode === 'video'
    ? v.meetUrl ? `Join on Google Meet: ${v.meetUrl}` : 'Your expert will email you the Google Meet link before the call.'
    : `Your expert will call you on ${learner.phone ?? 'your registered number'}.`
  const label = v.mode === 'video' ? 'video call on Google Meet' : 'phone call'
  const jobs: Promise<void>[] = []
  if (what === 'cancelled') {
    jobs.push(sendMail({
      to: learner.email, subject: `Your Learnbay ${label} on ${v.when} is cancelled`,
      heading: `Hi ${first}, your call is cancelled`,
      paragraphs: [`Your ${label} with ${v.host} on ${v.when} (IST) has been cancelled${reason ? `: ${reason}` : ''}.`, 'You can book a new time in your Career Studio whenever it suits you.'],
      cta: { label: 'Book a new time', url: learnerUrl(learner.id, '/dashboard/sessions') },
    }))
    jobs.push(sendMail({ to: host.email, subject: `Cancelled: ${label} with ${learner.name ?? learner.email}, ${v.when}`, heading: 'Meeting cancelled', paragraphs: [`${learner.name ?? learner.email}, ${v.when} (IST).${reason ? ` Reason: ${reason}` : ''}`], cta: { label: 'Open the lead', url: `${env.appUrl}/admin/crm/leads/${learner.id}` } }))
  } else {
    const att = [{ filename: 'learnbay-call.ics', content: ics(v, `Learnbay ${label} with ${v.host}`, how), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }]
    jobs.push(sendMail({
      to: learner.email,
      subject: what === 'link' ? `Your Google Meet link for ${v.when}` : `Your Learnbay ${label} is booked: ${v.when}`,
      preheader: how,
      heading: what === 'link' ? `Here’s your link, ${first}` : `You’re booked, ${first}`,
      paragraphs: [
        `${v.host}, a Learnbay career expert, will meet you on ${v.when} (IST) for about ${Math.round((new Date(v.endsAt).getTime() - new Date(v.startsAt).getTime()) / 60_000)} minutes.`,
        how,
        'Keep your reports handy: your expert uses them to go straight to your plan, the right program, and fees or EMI if you want.',
      ],
      cta: v.mode === 'video' && v.meetUrl ? { label: 'Join on Google Meet', url: v.meetUrl } : { label: 'Open my Career Studio', url: learnerUrl(learner.id, '/dashboard/sessions') },
      attachments: att,
    }))
    jobs.push(sendMail({
      to: host.email,
      subject: `${what === 'link' ? 'Link added' : 'New meeting'}: ${learner.name ?? learner.email}, ${v.when}`,
      heading: what === 'link' ? 'The learner has the Meet link' : `You have a ${label}`,
      paragraphs: [
        `${learner.name ?? learner.email} (${learner.email}${learner.phone ? `, ${learner.phone}` : ''}), ${v.when} (IST).`,
        v.mode === 'video' ? (v.meetUrl ? `Google Meet: ${v.meetUrl}` : 'No Meet link yet: open the lead and add one (or save your own Meet room under Team → My profile).') : 'Call them on their phone number.',
        'Open the lead to see their reports and profile before the call. Log the outcome afterwards.',
      ],
      cta: { label: 'Open the lead', url: `${env.appUrl}/admin/crm/leads/${learner.id}` },
      attachments: att,
    }))
  }
  const results = await Promise.allSettled(jobs)
  for (const r of results) if (r.status === 'rejected') console.error('[meet] email failed', (r.reason as Error)?.message)
}
