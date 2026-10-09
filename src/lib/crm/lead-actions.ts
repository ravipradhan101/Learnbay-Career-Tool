import { query, queryOne, transaction } from '../db'
import { env } from '../env'
import type { StaffUser } from '../admin-auth'
import { getReadyResults } from '../data'
import { sendMail } from '../mailer'
import { isAnswered, isValidPhone, type Answers, type ToolQuestionKey } from '../questions'
import { emailToolReport } from '../report-email'
import { cleanText, normalizeEmail, rateLimit } from '../security'
import { generateTool } from '../tools'
import { getTool, QUESTION_TITLES } from '../tools-meta'
import type { ToolResultMap } from '../tool-types'
import { firstName, sanitizeAnswers } from '../validation'
import { claimCreatedLead, logActivity, reassignLead } from './allocate'
import { emitLeadEvent } from './webhooks'
import type { LeadRef } from './guard'
import { assignableIds, byId, displayName, staffDirectory } from './scope'
import { isLeadStatus, isOutcome, outcomeLabel, statusLabel } from './roles'
import { bookByStaff, cancelMeeting, closeMeetingFromTask, setMeetingLink } from '../meet/meetings'
import { cleanMeetUrl } from '../meet/google'

export type Result = { ok: true; message: string; data?: Record<string, unknown> } | { ok: false; status: number; error: string; data?: Record<string, unknown> }
const fail = (error: string, status = 400, data?: Record<string, unknown>): Result => ({ ok: false, status, error, data })

/**
 * A new lead entered by staff. ISMs keep it; associates give it to themselves or their ISMs; managers to themselves,
 * their associates or ISMs; the admin to anyone. A person who is already somebody's lead is never taken over.
 */
export async function createLead(me: StaffUser, b: Record<string, unknown>): Promise<Result> {
  const name = cleanText(b.name, 80)
  if (name.length < 2 || !/[\p{L}]/u.test(name)) return fail('Enter the lead’s full name.')
  const email = normalizeEmail(b.email)
  if (!email) return fail('Enter a valid email address.')
  const phoneCountry = typeof b.phoneCountry === 'string' ? b.phoneCountry : '+91'
  const phone = typeof b.phone === 'string' ? b.phone.replace(/[\s-]/g, '') : ''
  if (!isValidPhone(phoneCountry, phone)) return fail('Enter a valid phone number.')
  const dir = await staffDirectory()
  const toId = typeof b.assignTo === 'string' && b.assignTo ? b.assignTo : me.id
  if (!assignableIds(me, dir).has(toId)) return fail('You can’t give a lead to that person.', 403)
  if (!(await rateLimit(`crm:create:${me.id}`, 200, 24 * 3600))) return fail('Daily limit for new leads reached.', 429)

  const created = await queryOne<{ id: string; inserted: boolean }>(
    `INSERT INTO users (email, name, phone_country, phone, source) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, (xmax = 0) AS inserted`,
    [email, name, phoneCountry, phone, JSON.stringify({ via: 'staff', by: me.id })],
  )
  if (!created) return fail('Could not save the lead.', 500)
  const existing = await queryOne<{ owner_id: string | null }>(`SELECT owner_id FROM lead_owners WHERE user_id = $1`, [created.id])
  if (existing?.owner_id) {
    const owner = byId(dir).get(existing.owner_id)
    const visible = assignableIds(me, dir).has(existing.owner_id) || me.role === 'admin'
    return fail(`This person is already a lead${visible ? `, owned by ${displayName(owner)}` : ' with another team member'}.`, 409, visible ? { id: created.id } : undefined)
  }
  if (!created.inserted && me.role !== 'admin') {
    // An existing Career Studio account that nobody owns yet is the admin's to give out; typing an email must never
    // be a way into someone's details.
    return fail('This person already has a Career Studio account. Ask the admin to assign them to you.', 409)
  }
  if (!created.inserted) {
    // An existing learner with no owner yet: fill in contact details they have not given, never overwrite.
    await query(`UPDATE users SET name = coalesce(name, $2), phone_country = coalesce(phone_country, $3), phone = coalesce(phone, $4) WHERE id = $1`, [created.id, name, phoneCountry, phone])
  }
  const r = await claimCreatedLead(me, created.id, email, `${phoneCountry}${phone}`, toId)
  const ownerName = displayName(byId(dir).get(r.ownerId))
  if (typeof b.note === 'string' && b.note.trim()) await query(`INSERT INTO lead_notes (user_id, author_id, body) VALUES ($1, $2, $3)`, [created.id, me.id, cleanText(b.note, 2000, true)])
  return {
    ok: true,
    message: r.source === 'crm' ? `Lead saved. The CRM already lists ${ownerName} as this person’s owner, so it went to them.` : `Lead saved and given to ${r.ownerId === me.id ? 'you' : ownerName}.`,
    data: { id: created.id, existing: !created.inserted },
  }
}

export async function reassign(me: StaffUser, lead: LeadRef, toId: unknown, note: unknown): Promise<Result> {
  if (me.role === 'ism') return fail('ISMs can’t reassign leads.', 403)
  const dir = await staffDirectory()
  if (typeof toId !== 'string' || !assignableIds(me, dir).has(toId)) return fail('You can’t give a lead to that person.', 403)
  await reassignLead(me, lead.id, toId, cleanText(note, 300))
  return { ok: true, message: `Given to ${toId === me.id ? 'you' : displayName(byId(dir).get(toId))}.` }
}

const MAX_ATTEMPTS = 6

/** Builds one of the learner's reports for them (same engine and same one-report-per-tool rule as the learner side). */
export async function generateReport(me: StaffUser, lead: LeadRef, tool: unknown): Promise<Result> {
  const meta = getTool(String(tool))
  if (!meta) return fail('Unknown report.')
  if (!(await rateLimit(`crm:gen:${me.id}`, 40, 3600))) return fail('Too many reports in an hour. Please try again later.', 429)
  const profile = await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [lead.id])
  const missing = meta.questions.filter((q) => !isAnswered(profile?.answers ?? {}, q))
  if (!profile || missing.length) return fail(`Fill in ${missing.map((q) => QUESTION_TITLES[q]?.title ?? q).join(', ') || 'the profile'} first.`, 400, { missing })

  await query(`INSERT INTO tool_results (user_id, tool) VALUES ($1, $2) ON CONFLICT (user_id, tool) DO NOTHING`, [lead.id, meta.id])
  const claimed = await queryOne<{ id: string }>(
    `UPDATE tool_results SET status = 'generating', attempts = attempts + 1, generating_started_at = now(), error = NULL, updated_at = now()
      WHERE user_id = $1 AND tool = $2 AND attempts < $3
        AND (status IN ('pending', 'failed') OR (status = 'generating' AND generating_started_at < now() - interval '4 minutes'))
      RETURNING id`,
    [lead.id, meta.id, MAX_ATTEMPTS],
  )
  if (!claimed) {
    const row = await queryOne<{ status: string }>(`SELECT status FROM tool_results WHERE user_id = $1 AND tool = $2`, [lead.id, meta.id])
    if (row?.status === 'ready') return { ok: true, message: 'This report is already ready.' }
    if (row?.status === 'generating') return { ok: true, message: 'This report is being built right now.' }
    return fail('This report failed several times. Please check the profile details and contact the admin.', 429)
  }
  try {
    const prior = await getReadyResults(lead.id)
    const data = await generateTool(meta.id, profile.answers, firstName(lead.name), prior, lead.id)
    await query(`UPDATE tool_results SET status = 'ready', data = $2, updated_at = now() WHERE id = $1`, [claimed.id, JSON.stringify(data)])
  } catch (err) {
    const message = (err as Error).message
    console.error(`[crm:report:${meta.id}] generation failed`, message)
    await query(`UPDATE tool_results SET status = 'failed', error = $2, updated_at = now() WHERE id = $1`, [claimed.id, message.slice(0, 500)])
    return fail('The report could not be built just now. Please try again.', 502)
  }
  await logActivity(null, me, lead.id, 'report_generated', { tool: meta.id })
  emitLeadEvent('report.generated', lead.id, { tool: meta.id, name: meta.name, by: 'staff' })
  return { ok: true, message: `${meta.name} is ready.` }
}

/** What a report needs, with the learner's own answer and any answer staff logged for it last time. */
export async function reportQuestions(userId: string, tool: string): Promise<{ key: ToolQuestionKey; title: string; answer: unknown; logged: unknown }[] | null> {
  const meta = getTool(tool)
  if (!meta) return null
  const row = await queryOne<{ answers: Answers | null; staff_answers: Answers | null }>(
    `SELECT a.answers, t.staff_answers FROM users u LEFT JOIN assessments a ON a.user_id = u.id LEFT JOIN tool_results t ON t.user_id = u.id AND t.tool = $2 WHERE u.id = $1`,
    [userId, meta.id],
  )
  return meta.questions.map((k) => ({ key: k, title: QUESTION_TITLES[k]?.title ?? k, answer: row?.answers?.[k] ?? null, logged: row?.staff_answers?.[k] ?? null }))
}

/**
 * Rebuilds a report from answers staff logged on the call. The learner's own profile is never changed: the logged
 * answers are kept with the report, the earlier version goes to history, and the learner sees the new one.
 */
export async function regenerateReport(me: StaffUser, lead: LeadRef, tool: unknown, raw: unknown): Promise<Result> {
  const meta = getTool(String(tool))
  if (!meta) return fail('Unknown report.')
  if (!(await rateLimit(`crm:gen:${me.id}`, 40, 3600))) return fail('Too many reports in an hour. Please try again later.', 429)
  const logged = sanitizeAnswers(raw)
  const own = (await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [lead.id]))?.answers ?? {}
  // Only the questions this report asks; everything else comes from the learner's own profile.
  const picked = Object.fromEntries(meta.questions.filter((k) => logged[k] !== undefined).map((k) => [k, logged[k]])) as Answers
  const answers: Answers = { ...own, ...picked }
  const missing = meta.questions.filter((q) => !isAnswered(answers, q))
  if (missing.length) return fail(`Answer ${missing.map((q) => QUESTION_TITLES[q]?.title ?? q).join(', ')} first.`, 400, { missing })

  await query(`INSERT INTO tool_results (user_id, tool) VALUES ($1, $2) ON CONFLICT (user_id, tool) DO NOTHING`, [lead.id, meta.id])
  const claimed = await queryOne<{ id: string; prev: unknown; prev_answers: unknown; prev_by: string | null; prev_at: Date }>(
    `UPDATE tool_results t SET status = 'generating', attempts = 0, generating_started_at = now(), error = NULL, updated_at = now()
       FROM tool_results old
      WHERE old.id = t.id AND t.user_id = $1 AND t.tool = $2
        AND NOT (t.status = 'generating' AND t.generating_started_at > now() - interval '4 minutes')
      RETURNING t.id, old.data AS prev, old.staff_answers AS prev_answers, old.generated_by AS prev_by, old.updated_at AS prev_at`,
    [lead.id, meta.id],
  )
  if (!claimed) return { ok: true, message: 'This report is being built right now.' }
  try {
    const prior = (await getReadyResults(lead.id)) as Partial<ToolResultMap>
    delete prior[meta.id]
    const data = await generateTool(meta.id, answers, firstName(lead.name), prior, lead.id)
    await transaction(async (db) => {
      if (claimed.prev) {
        await db.query(`INSERT INTO tool_result_history (user_id, tool, data, answers, built_by, built_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [lead.id, meta.id, JSON.stringify(claimed.prev), claimed.prev_answers ? JSON.stringify(claimed.prev_answers) : null, claimed.prev_by, claimed.prev_at])
      }
      await db.query(`UPDATE tool_results SET status = 'ready', data = $2, staff_answers = $3, generated_by = $4, updated_at = now() WHERE id = $1`,
        [claimed.id, JSON.stringify(data), JSON.stringify(picked), me.id])
      await logActivity(db, me, lead.id, 'report_regenerated', { tool: meta.id, answers: picked })
    })
  } catch (err) {
    const message = (err as Error).message
    console.error(`[crm:report:${meta.id}] regeneration failed`, message)
    // Put the earlier report back so the learner is never left without one.
    await query(`UPDATE tool_results SET status = CASE WHEN data IS NULL THEN 'failed' ELSE 'ready' END, error = $2, updated_at = now() WHERE id = $1`, [claimed.id, message.slice(0, 500)])
    return fail('The report could not be built just now. Please try again.', 502)
  }
  emitLeadEvent('report.generated', lead.id, { tool: meta.id, name: meta.name, by: 'staff', answers: picked })
  return { ok: true, message: `${meta.name} rebuilt with the answers you logged.` }
}

/** Emails a ready report (with its PDF) to the learner's own registered email, never to another address. */
export async function emailReport(me: StaffUser, lead: LeadRef, tool: unknown): Promise<Result> {
  const meta = getTool(String(tool))
  if (!meta) return fail('Unknown report.')
  if (!(await rateLimit(`crm:report-email:${lead.id}:${meta.id}`, 3, 3600))) return fail('This report was emailed to them a few times in the last hour already.', 429)
  const row = await queryOne<{ data: ToolResultMap[typeof meta.id]; answers: Answers }>(
    `SELECT t.data, coalesce(a.answers, '{}') || coalesce(t.staff_answers, '{}') AS answers
       FROM tool_results t LEFT JOIN assessments a ON a.user_id = t.user_id WHERE t.user_id = $1 AND t.tool = $2 AND t.status = 'ready'`,
    [lead.id, meta.id],
  )
  if (!row) return fail('Generate this report first.')
  try {
    await emailToolReport({ userId: lead.id, to: lead.email, name: firstName(lead.name), meta, data: row.data, answers: row.answers })
  } catch (err) {
    console.error('[crm:report-email] failed', (err as Error).message)
    return fail('The email could not be sent just now. Please try again in a minute.', 502)
  }
  await logActivity(null, me, lead.id, 'report_emailed', { tool: meta.id })
  emitLeadEvent('report.emailed', lead.id, { tool: meta.id, name: meta.name })
  return { ok: true, message: `${meta.name} emailed to ${lead.email}.` }
}

/** Ready-made emails staff can send. Every one links back into the learner's own Career Studio. */
export const EMAIL_TEMPLATES = {
  book_call: { label: 'Invite to book a counselling call', subject: 'Your free 1:1 counselling call', heading: 'Let’s plan your next career move', body: 'I tried to reach you about your career plan. Pick a time that suits you for a free 1:1 call with a Senior Career Counsellor, and we will walk you through your options.', cta: { label: 'Book my call', path: '/dashboard/sessions' } },
  finish_profile: { label: 'Ask them to finish their profile', subject: 'A couple of details to finish your career plan', heading: 'You’re almost there', body: 'Your career plan is nearly ready. Answer the last few questions in Career Studio so we can build your skill gap, salary and roadmap reports.', cta: { label: 'Finish my profile', path: '/dashboard' } },
  sign_in: { label: 'Send a sign-in link', subject: 'Your Learnbay Career Studio', heading: 'Your Career Studio is waiting', body: 'Sign in with this email address to see your reports, chat with your counsellor and book a call. We will send you a 6-digit code; no password needed.', cta: { label: 'Open Career Studio', path: '/login' } },
  custom: { label: 'Write my own message', subject: '', heading: '', body: '', cta: { label: 'Open Career Studio', path: '/dashboard' } },
} as const
export type TemplateId = keyof typeof EMAIL_TEMPLATES

function multiline(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : ''
}

/** Sends an email to the lead (their registered address only), signed by the staff member. */
export async function sendLeadEmail(me: StaffUser, lead: LeadRef, b: Record<string, unknown>): Promise<Result> {
  const id = typeof b.template === 'string' && b.template in EMAIL_TEMPLATES ? (b.template as TemplateId) : null
  if (!id) return fail('Choose an email.')
  const t = EMAIL_TEMPLATES[id]
  const subject = cleanText(b.subject, 150) || t.subject
  const message = multiline(b.message, 4000) || t.body
  if (subject.length < 3 || message.length < 10) return fail('Add a subject and a message.')
  if (!(await rateLimit(`crm:email:${me.id}`, 100, 3600)) || !(await rateLimit(`crm:email:lead:${lead.id}`, 5, 24 * 3600))) return fail('Too many emails to this person today.', 429)
  const sender = (await queryOne<{ name: string | null; email: string }>(`SELECT name, email FROM admin_users WHERE id = $1`, [me.id]))!
  try {
    await sendMail({
      to: lead.email,
      subject,
      heading: t.heading || `Hi ${firstName(lead.name)}`,
      paragraphs: [...(t.heading ? [`Hi ${firstName(lead.name)},`] : []), ...message.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ')), `${sender.name ?? 'Your counsellor'}, Learnbay`],
      cta: { label: t.cta.label, url: `${env.appUrl}${t.cta.path}` },
    })
  } catch (err) {
    console.error('[crm:email] failed', (err as Error).message)
    return fail('The email could not be sent just now. Please try again in a minute.', 502)
  }
  await logActivity(null, me, lead.id, 'email_sent', { template: id, subject })
  return { ok: true, message: `Email sent to ${lead.email}.` }
}

export async function addNote(me: StaffUser, lead: LeadRef, text: unknown): Promise<Result> {
  const body = multiline(text, 2000)
  if (body.length < 2) return fail('Write a note.')
  await query(`INSERT INTO lead_notes (user_id, author_id, body) VALUES ($1, $2, $3)`, [lead.id, me.id, body])
  await logActivity(null, me, lead.id, 'note_added', {})
  emitLeadEvent('note.added', lead.id, { body, author: me.name ?? me.email })
  return { ok: true, message: 'Note added.' }
}

/** A reminder or a follow-up call, for the lead's owner (or for me when I own it or it is unassigned). */
export async function addTask(me: StaffUser, lead: LeadRef, b: Record<string, unknown>): Promise<Result> {
  const kind = b.kind === 'follow_up' ? 'follow_up' : 'reminder'
  const title = cleanText(b.title, 140) || (kind === 'follow_up' ? 'Follow-up call' : 'Reminder')
  const due = new Date(String(b.dueAt ?? ''))
  if (Number.isNaN(due.getTime())) return fail('Choose when.')
  if (due.getTime() < Date.now() - 5 * 60_000 || due.getTime() > Date.now() + 180 * 86_400_000) return fail('Pick a time in the next 6 months.')
  const owner = lead.owner_id ?? me.id
  await query(
    `INSERT INTO lead_tasks (user_id, owner_id, kind, title, note, due_at, missed_at, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [lead.id, owner, kind, title, multiline(b.note, 1000) || null, due, kind === 'follow_up' ? new Date(due.getTime() + 60 * 60_000) : null, me.id],
  )
  await logActivity(null, me, lead.id, 'task_created', { title, due: due.toISOString() })
  return { ok: true, message: 'Reminder set.' }
}

/**
 * Closes a call or reminder with what happened. A connected call marks the lead contacted (if it was new) and the
 * learner's booking as contacted, so the learner side shows the same picture.
 */
export async function completeTask(me: StaffUser, lead: LeadRef, taskId: unknown, b: Record<string, unknown>): Promise<Result> {
  const task = await queryOne<{ id: string; kind: string; status: string; source_id: string | null }>(
    `SELECT id, kind, status, source_id FROM lead_tasks WHERE id = $1 AND user_id = $2`,
    [typeof taskId === 'string' && /^[0-9a-f-]{36}$/i.test(taskId) ? taskId : '00000000-0000-0000-0000-000000000000', lead.id],
  )
  if (!task) return fail('Reminder not found.', 404)
  if (task.status !== 'open') return fail('This one is already closed.')
  const isCall = task.kind !== 'reminder'
  const outcome = isCall ? (isOutcome(b.outcome) ? b.outcome : null) : 'done'
  if (!outcome) return fail('Choose what happened on the call.')
  const note = multiline(b.note, 1000)
  // "No answer" and "busy" keep a call open for another try unless asked to close it.
  const close = !isCall || !['no_answer', 'busy'].includes(outcome) || b.close === true
  await transaction(async (db) => {
    if (close) {
      await db.query(`UPDATE lead_tasks SET status = 'done', outcome = $2, outcome_note = $3, completed_by = $4, completed_at = now() WHERE id = $1`, [task.id, outcome, note || null, me.id])
    } else {
      await db.query(`UPDATE lead_tasks SET outcome = $2, outcome_note = $3 WHERE id = $1`, [task.id, outcome, note || null])
    }
    await logActivity(db, me, lead.id, isCall ? 'call_logged' : 'task_done', { outcome, ...(note ? { note } : {}), task: task.id })
    if (isCall) {
      const next = outcome === 'enrolled' ? 'enrolled' : outcome === 'not_interested' ? 'not_interested' : outcome === 'connected' ? 'contacted' : null
      if (next) {
        const from = lead.status ?? 'new'
        const r = await db.query(
          `UPDATE lead_owners SET status = $2, updated_at = now() WHERE user_id = $1 AND (status = 'new' OR $2 IN ('enrolled', 'not_interested')) AND status <> $2 RETURNING user_id`,
          [lead.id, next],
        )
        if (r.rowCount) {
          await logActivity(db, me, lead.id, 'status_changed', { from, to: next })
          emitLeadEvent('lead.status_changed', lead.id, { from, to: next, by: 'call_outcome' })
        }
      }
      if (task.kind === 'meeting' && task.source_id && close) await closeMeetingFromTask(db, task.source_id, outcome)
      if (task.kind === 'call_booked' && task.source_id && outcome === 'connected') await db.query(`UPDATE counsellor_requests SET status = 'contacted' WHERE id = $1 AND status = 'new'`, [task.source_id])
      if (task.kind === 'call_request' && task.source_id && outcome === 'connected') await db.query(`UPDATE call_requests SET status = 'contacted' WHERE id = $1`, [task.source_id])
    }
  })
  emitLeadEvent('call.logged', lead.id, { outcome, closed: close, ...(note ? { note } : {}) })
  return { ok: true, message: close ? `Logged: ${outcomeLabel(outcome)}.` : `Logged: ${outcomeLabel(outcome)}. The call stays open for another try.` }
}

/** Book a video (Google Meet) or phone meeting with the lead, hosted by me or someone I may give work to. */
export async function bookMeeting(me: StaffUser, lead: LeadRef, b: Record<string, unknown>): Promise<Result> {
  const dir = await staffDirectory()
  const hostId = typeof b.hostId === 'string' && b.hostId ? b.hostId : me.id
  if (!assignableIds(me, dir).has(hostId)) return fail('You can’t book a meeting for that person.', 403)
  if (!(await rateLimit(`crm:meet:${me.id}`, 60, 3600))) return fail('Too many meetings booked in an hour.', 429)
  const r = await bookByStaff(me.id, lead.id, { hostId, startsAt: b.startsAt, minutes: b.minutes, mode: b.mode, note: b.note })
  if (!r.ok) return fail(r.error, r.status)
  await logActivity(null, me, lead.id, 'meeting_booked', { mode: r.meeting.mode, when: r.meeting.when, host: hostId })
  emitLeadEvent('meeting.booked', lead.id, { mode: r.meeting.mode, when: r.meeting.when, host: byId(dir).get(hostId)?.email ?? null })
  const host = displayName(byId(dir).get(hostId))
  return { ok: true, message: `Booked ${r.meeting.when} with ${hostId === me.id ? 'you' : host}. ${r.meeting.mode === 'video' ? (r.meeting.meetUrl ? 'The Meet link is in both emails.' : 'Add a Meet link below so they get it.') : 'Both of you have the details by email.'}` }
}

async function meetingInScope(me: StaffUser, lead: LeadRef, meetingId: unknown): Promise<string | null> {
  if (typeof meetingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(meetingId)) return null
  const m = await queryOne<{ id: string }>(`SELECT id FROM meetings WHERE id = $1 AND user_id = $2`, [meetingId, lead.id])
  return m?.id ?? null
}

export async function cancelLeadMeeting(me: StaffUser, lead: LeadRef, b: Record<string, unknown>): Promise<Result> {
  const id = await meetingInScope(me, lead, b.meetingId)
  if (!id) return fail('Meeting not found.', 404)
  const r = await cancelMeeting(id, lead.id, cleanText(b.reason, 200))
  if (!r.ok) return fail(r.error ?? 'Could not cancel.')
  await logActivity(null, me, lead.id, 'meeting_cancelled', {})
  return { ok: true, message: 'Meeting cancelled. The learner and the host were told by email.' }
}

export async function addMeetingLink(me: StaffUser, lead: LeadRef, b: Record<string, unknown>): Promise<Result> {
  const url = cleanMeetUrl(b.url)
  if (!url) return fail('Paste a Google Meet link like https://meet.google.com/abc-defg-hij')
  const id = await meetingInScope(me, lead, b.meetingId)
  if (!id) return fail('Meeting not found.', 404)
  const r = await setMeetingLink(id, lead.id, url)
  if (!r.ok) return fail(r.error ?? 'Could not save the link.')
  await logActivity(null, me, lead.id, 'meeting_link', {})
  return { ok: true, message: 'Link saved and emailed to the learner.' }
}
