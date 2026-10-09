import { query, queryOne } from '../db'
import type { StaffUser } from '../admin-auth'
import type { Answers } from '../questions'
import { getTool, TOOLS } from '../tools-meta'
import { whenLabel } from '../sessions'
import { MISSED_SQL } from './tasks'
import { byId, chainOf, displayName, staffDirectory, visibleIds, type StaffRow } from './scope'
import { actionLabel, ACTOR_LABEL, outcomeLabel, type ActorKind } from './roles'

/** Owner ids `me` may see, or null for the admin (everything, including unassigned leads). */
export async function scopeIds(me: StaffUser): Promise<string[] | null> {
  if (me.role === 'admin') return null
  return [...visibleIds(me, await staffDirectory())]
}

/** SQL condition: lead (alias lo) is in scope $n. */
const inScope = (n: number) => `($${n}::uuid[] IS NULL OR lo.owner_id = ANY($${n}::uuid[]))`

// ---------- Leads ----------

export type LeadFilters = { q: string; status: string; owner: string; unassigned: boolean; missed: boolean; page: number; band?: string; sort?: 'new' | 'intent' }
export type LeadRow = {
  id: string; name: string | null; email: string; phone_country: string | null; phone: string | null; created_at: Date; last_login_at: Date | null
  owner_id: string | null; status: string | null; source: string | null; reports: number; next_due: Date | null; missed: number; last_touch: Date | null
  intent: number | null; band: string | null; scored_at: Date | null
}
export const PAGE_SIZE = 50

export async function listLeads(me: StaffUser, f: LeadFilters): Promise<{ rows: LeadRow[]; total: number }> {
  const scope = await scopeIds(me)
  const like = f.q ? `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : ''
  const where = `${inScope(1)}
    AND ($2 = '' OR (coalesce(u.name, '') || ' ' || u.email || ' ' || coalesce(u.phone, '')) ILIKE $2)
    AND ($3 = '' OR coalesce(lo.status, 'new') = $3)
    AND ($4 = '' OR lo.owner_id::text = $4)
    AND (NOT $5 OR lo.owner_id IS NULL)
    AND (NOT $6 OR EXISTS (SELECT 1 FROM lead_tasks t WHERE t.user_id = u.id AND ${MISSED_SQL}))
    AND ($7 = '' OR li.band = $7)`
  const params = [scope, like, f.status, f.owner, f.unassigned && me.role === 'admin', f.missed, f.band ?? '']
  const [rows, total] = await Promise.all([
    query<LeadRow>(
      `SELECT u.id, u.name, u.email, u.phone_country, u.phone, u.created_at, u.last_login_at, lo.owner_id, lo.status, lo.source,
              (SELECT count(*)::int FROM tool_results t WHERE t.user_id = u.id AND t.status = 'ready') AS reports,
              (SELECT min(t.due_at) FROM lead_tasks t WHERE t.user_id = u.id AND t.status = 'open') AS next_due,
              (SELECT count(*)::int FROM lead_tasks t WHERE t.user_id = u.id AND ${MISSED_SQL}) AS missed,
              (SELECT max(a.created_at) FROM lead_activities a WHERE a.user_id = u.id AND a.actor_id IS NOT NULL) AS last_touch,
              li.intent, li.band, li.updated_at AS scored_at
         FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id LEFT JOIN lead_insights li ON li.user_id = u.id
        WHERE ${where}
        ORDER BY ${f.sort === 'intent' ? 'li.intent DESC NULLS LAST, ' : ''}u.created_at DESC LIMIT ${PAGE_SIZE} OFFSET $8`,
      [...params, Math.max(0, f.page - 1) * PAGE_SIZE],
    ),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id LEFT JOIN lead_insights li ON li.user_id = u.id WHERE ${where}`, params),
  ])
  return { rows, total: total?.n ?? 0 }
}

// ---------- One lead ----------

export type TimelineItem = { at: Date; actor: ActorKind; who: string; text: string; detail?: string }
export type TaskRow = {
  id: string; user_id: string; owner_id: string | null; kind: string; title: string; note: string | null; due_at: Date; missed_at: Date | null
  status: string; outcome: string | null; outcome_note: string | null; completed_at: Date | null; completed_by: string | null; missed: boolean
  lead_name?: string | null; lead_email?: string; lead_phone?: string | null; meet_url?: string | null
}

const USER_EVENTS: Record<string, string> = {
  call_requested: 'Asked for a call', first_pick: 'Picked where to start', program_click: 'Opened a program page', brochure_click: 'Opened a brochure',
  masterclass_interest: 'Showed interest in a masterclass', report_emailed: 'Emailed themselves a report', share_created: 'Shared a report',
  why_learnbay_completed: 'Read “Why Learnbay”', usp_click: 'Opened a Learnbay highlight', eligibility_completed: 'Took the eligibility test',
  resource_click: 'Opened a resource', call_sheet_open: 'Opened the call options', meeting_booked: 'Booked a video call with an expert',
}

const FIELD_LABEL: Record<string, string> = {
  name: 'name', phone: 'phone', role: 'current role', roleOther: 'current role', experience: 'experience', programmer: 'coding', interest: 'interest',
  domain: 'industry', domainOther: 'industry', goal: 'goal', targetRole: 'target role', skills: 'skills', ctc: 'CTC', city: 'city',
  weeklyHours: 'hours a week', timeline: 'timeline',
}

export async function leadDetail(id: string) {
  const dir = await staffDirectory()
  const ids = byId(dir)
  const [user, answers, reports, bookings, tasks, notes, events, activities, assignments, meetings] = await Promise.all([
    queryOne<{ id: string; email: string; name: string | null; phone_country: string | null; phone: string | null; created_at: Date; last_login_at: Date | null; email_verified_at: Date | null; owner_id: string | null; status: string | null; source: string | null; assigned_at: Date | null; created_by: string | null }>(
      `SELECT u.id, u.email, u.name, u.phone_country, u.phone, u.created_at, u.last_login_at, u.email_verified_at,
              lo.owner_id, lo.status, lo.source, lo.assigned_at, lo.created_by
         FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE u.id = $1`,
      [id],
    ),
    queryOne<{ answers: Answers; updated_at: Date }>(`SELECT answers, updated_at FROM assessments WHERE user_id = $1`, [id]),
    query<{ tool: string; status: string; updated_at: Date; staff_answers: Answers | null; generated_by: string | null; versions: number }>(
      `SELECT t.tool, t.status, t.updated_at, t.staff_answers, t.generated_by,
              (SELECT count(*)::int FROM tool_result_history h WHERE h.user_id = t.user_id AND h.tool = t.tool) AS versions
         FROM tool_results t WHERE t.user_id = $1`, [id]),
    query<{ id: string; date: string | null; time: string | null; status: string; rescheduled: number; created_at: Date }>(
      `SELECT id, to_char(preferred_date, 'YYYY-MM-DD') AS date, preferred_time AS time, status, rescheduled, created_at
         FROM counsellor_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id],
    ),
    query<TaskRow>(`SELECT t.*, ${MISSED_SQL} AS missed, (SELECT m.meet_url FROM meetings m WHERE t.kind = 'meeting' AND m.id = t.source_id) AS meet_url FROM lead_tasks t WHERE t.user_id = $1 ORDER BY (t.status = 'open') DESC, t.due_at DESC LIMIT 50`, [id]),
    query<{ id: number; body: string; author_id: string | null; created_at: Date }>(`SELECT id, body, author_id, created_at FROM lead_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
    query<{ type: string; detail: Record<string, string>; created_at: Date }>(`SELECT type, detail, created_at FROM lead_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 80`, [id]),
    query<{ actor_kind: ActorKind; actor_id: string | null; action: string; detail: Record<string, unknown>; created_at: Date }>(
      `SELECT actor_kind, actor_id, action, detail, created_at FROM lead_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [id],
    ),
    query<{ from_id: string | null; to_id: string | null; source: string; by_id: string | null; created_at: Date }>(
      `SELECT from_id, to_id, source, by_id, created_at FROM lead_assignments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [id],
    ),
    query<{ id: string; host_id: string; mode: string; kind: string; starts_at: Date; ends_at: Date; meet_url: string | null; status: string; requested_by: string; note: string | null; cancel_reason: string | null }>(
      `SELECT id, host_id, mode, kind, starts_at, ends_at, meet_url, status, requested_by, note, cancel_reason FROM meetings WHERE user_id = $1 ORDER BY starts_at DESC LIMIT 20`,
      [id],
    ),
  ])
  if (!user) return null

  const staffName = (sid: unknown) => (typeof sid === 'string' ? displayName(ids.get(sid)) : '')
  const timeline: TimelineItem[] = []
  const staffTools = new Set(activities.filter((a) => a.action === 'report_generated' || a.action === 'report_regenerated').map((a) => String(a.detail.tool)))
  if (!user.created_by) timeline.push({ at: user.created_at, actor: 'user', who: user.name ?? 'Learner', text: 'Signed up on Career Studio' })
  for (const e of events) timeline.push({ at: e.created_at, actor: 'user', who: user.name ?? 'Learner', text: USER_EVENTS[e.type] ?? e.type.replace(/_/g, ' '), detail: e.detail?.tool ? getTool(e.detail.tool)?.name : undefined })
  for (const r of reports) {
    if (r.status === 'ready' && !staffTools.has(r.tool)) timeline.push({ at: r.updated_at, actor: 'user', who: user.name ?? 'Learner', text: 'Generated a report', detail: getTool(r.tool)?.name })
  }
  for (const b of bookings) {
    timeline.push({ at: b.created_at, actor: 'user', who: user.name ?? 'Learner', text: 'Booked a counselling call', detail: b.date && b.time ? `${whenLabel(b.date, b.time)}${b.rescheduled ? ` (rescheduled ${b.rescheduled}×)` : ''}` : undefined })
  }
  for (const a of activities) {
    const d = a.detail as Record<string, unknown>
    let detail = ''
    if (a.action === 'lead_created' && d.via === 'api') detail = `through the API (${String(d.key ?? '')})`
    else if (a.action === 'api_enriched') detail = [Array.isArray(d.filled) && d.filled.length ? `filled ${(d.filled as string[]).join(', ')}` : 'nothing to fill', d.note ? 'note added' : '', `matched by ${String(d.matchedBy ?? 'email')}`].filter(Boolean).join(' · ')
    else if (a.action === 'status_changed' && d.via === 'main_crm') detail = `${String(d.from ?? 'new')} → ${String(d.to ?? '')} · synced from the main CRM`.replace(/_/g, ' ')
    else if (a.action === 'reassigned' || a.action === 'allocated' || a.action === 'lead_created') detail = `to ${staffName(d.to)}${a.action === 'reassigned' && d.from ? ` (from ${staffName(d.from)})` : ''}${d.source === 'crm' ? ' · CRM owner' : d.source === 'round_robin' ? ' · round robin' : ''}`
    else if (a.action === 'status_changed') detail = `${String(d.from ?? 'new')} → ${String(d.to ?? '')}`.replace(/_/g, ' ')
    else if (a.action === 'report_generated' || a.action === 'report_regenerated' || a.action === 'report_emailed') detail = getTool(String(d.tool))?.name ?? ''
    else if (a.action === 'email_sent') detail = String(d.subject ?? '')
    else if (a.action === 'call_logged' || a.action === 'task_done') detail = [outcomeLabel(d.outcome as string), d.note ? `“${String(d.note)}”` : ''].filter(Boolean).join(' · ')
    else if (a.action === 'task_created') detail = String(d.title ?? '')
    else if (a.action === 'meeting_booked') detail = `${d.mode === 'phone' ? 'phone' : 'Google Meet'} · ${String(d.when ?? '')}${d.host && d.host !== a.actor_id ? ` · host ${staffName(d.host)}` : ''}`
    else if (a.action === 'profile_updated') detail = Array.isArray(d.fields) ? (d.fields as string[]).map((f) => FIELD_LABEL[f] ?? f).join(', ') : ''
    timeline.push({ at: a.created_at, actor: a.actor_kind, who: a.actor_id ? staffName(a.actor_id) : ACTOR_LABEL[a.actor_kind], text: actionLabel(a.action), detail: detail || undefined })
  }
  timeline.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())

  return {
    user, answers: answers?.answers ?? {}, answersUpdated: answers?.updated_at ?? null,
    reports: TOOLS.map((t) => {
      const r = reports.find((x) => x.tool === t.id)
      return {
        id: t.id, name: t.name, status: r?.status ?? 'none', updated_at: r?.updated_at ?? null, questions: t.questions,
        staffAnswers: r?.staff_answers ?? null, builtBy: r?.generated_by ? displayName(ids.get(r.generated_by)) : r?.status === 'ready' ? 'the learner' : null, versions: r?.versions ?? 0,
      }
    }),
    bookings, tasks, notes: notes.map((n) => ({ ...n, author: staffName(n.author_id) })),
    timeline: timeline.slice(0, 150),
    assignments: assignments.map((a) => ({ ...a, from: staffName(a.from_id), to: staffName(a.to_id), by: a.by_id ? staffName(a.by_id) : 'System' })),
    chain: chainOf(user.owner_id, ids),
    meetings: meetings.map((m) => ({ ...m, host: staffName(m.host_id) })),
  }
}

// ---------- Tasks and reminders ----------

export type TaskView = 'due' | 'upcoming' | 'missed' | 'done'

export async function listTasks(me: StaffUser, view: TaskView, ownerFilter: string, mine: boolean): Promise<TaskRow[]> {
  const scope = await scopeIds(me)
  const cond = {
    due: `t.status = 'open' AND t.due_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'`,
    upcoming: `t.status = 'open' AND t.due_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'`,
    missed: `${MISSED_SQL} AND t.missed_at >= now() - interval '30 days'`,
    done: `t.status = 'done' AND t.completed_at >= now() - interval '14 days'`,
  }[view]
  return query<TaskRow>(
    `SELECT t.*, ${MISSED_SQL} AS missed, u.name AS lead_name, u.email AS lead_email, coalesce(u.phone_country, '') || ' ' || coalesce(u.phone, '') AS lead_phone,
            (SELECT m.meet_url FROM meetings m WHERE t.kind = 'meeting' AND m.id = t.source_id) AS meet_url
       FROM lead_tasks t JOIN users u ON u.id = t.user_id LEFT JOIN lead_owners lo ON lo.user_id = t.user_id
      WHERE ($1::uuid[] IS NULL OR t.owner_id = ANY($1::uuid[]))
        AND ($2 = '' OR t.owner_id::text = $2) AND (NOT $3 OR t.owner_id = $4)
        AND ${cond}
      ORDER BY ${view === 'done' ? 't.completed_at DESC' : view === 'missed' ? 't.missed_at DESC' : 't.due_at ASC'} LIMIT 200`,
    [scope, ownerFilter, mine, me.id],
  )
}

/** Open reminders due within the next 15 minutes or overdue, for `me` personally (the header bell). */
export async function myDueCount(me: StaffUser): Promise<{ due: number; overdue: number }> {
  const r = await queryOne<{ due: number; overdue: number }>(
    `SELECT count(*) FILTER (WHERE due_at <= now() + interval '15 minutes' OR (kind = 'meeting' AND due_at <= now() + interval '40 minutes'))::int AS due,
            count(*) FILTER (WHERE due_at < now())::int AS overdue
       FROM lead_tasks WHERE owner_id = $1 AND status = 'open'`,
    [me.id],
  )
  return r ?? { due: 0, overdue: 0 }
}

// ---------- Analytics ----------

/** KPIs for whatever `me` can see, since `since`. */
export async function kpis(me: StaffUser, since: Date) {
  const scope = await scopeIds(me)
  const r = await queryOne<Record<string, number>>(
    `SELECT
       (SELECT count(*)::int FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE ${inScope(1)}) AS leads,
       (SELECT count(*)::int FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE ${inScope(1)} AND u.created_at >= $2) AS new_leads,
       (SELECT count(*)::int FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE lo.owner_id IS NULL AND $1::uuid[] IS NULL) AS unassigned,
       (SELECT count(*)::int FROM lead_owners lo WHERE ${inScope(1)} AND lo.status IN ('contacted', 'interested', 'enrolled', 'not_interested')) AS contacted,
       (SELECT count(*)::int FROM lead_owners lo WHERE ${inScope(1)} AND lo.status = 'interested') AS interested,
       (SELECT count(*)::int FROM lead_owners lo WHERE ${inScope(1)} AND lo.status = 'enrolled') AS enrolled,
       (SELECT count(*)::int FROM lead_tasks t LEFT JOIN lead_owners lo ON lo.user_id = t.user_id WHERE ($1::uuid[] IS NULL OR t.owner_id = ANY($1::uuid[])) AND t.status = 'open' AND t.due_at < now()) AS overdue,
       (SELECT count(*)::int FROM lead_tasks t WHERE ($1::uuid[] IS NULL OR t.owner_id = ANY($1::uuid[])) AND t.status = 'open'
          AND t.due_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata') AS due_today,
       (SELECT count(*)::int FROM lead_tasks t WHERE ($1::uuid[] IS NULL OR t.owner_id = ANY($1::uuid[])) AND ${MISSED_SQL} AND t.missed_at >= $2) AS missed,
       (SELECT count(*)::int FROM lead_tasks t WHERE ($1::uuid[] IS NULL OR t.owner_id = ANY($1::uuid[])) AND t.kind IN ('call_booked', 'call_request', 'follow_up', 'meeting') AND t.status = 'done' AND t.completed_at >= $2) AS calls_done`,
    [scope, since],
  )
  return r ?? {}
}

export type PersonStats = {
  id: string; leads: number; received: number; contacted: number; interested: number; enrolled: number; open_tasks: number
  missed: number; calls_done: number; actions: number; reports: number; emails: number
}

/** One row per person in scope. */
export async function teamStats(me: StaffUser, since: Date): Promise<(PersonStats & { person: StaffRow })[]> {
  const dir = await staffDirectory()
  const visible = visibleIds(me, dir)
  const people = dir.filter((s) => visible.has(s.id))
  if (!people.length) return []
  const rows = await query<PersonStats>(
    `SELECT s.id,
       (SELECT count(*)::int FROM lead_owners lo WHERE lo.owner_id = s.id) AS leads,
       (SELECT count(*)::int FROM lead_assignments la WHERE la.to_id = s.id AND la.created_at >= $2) AS received,
       (SELECT count(*)::int FROM lead_owners lo WHERE lo.owner_id = s.id AND lo.status IN ('contacted', 'interested', 'enrolled', 'not_interested')) AS contacted,
       (SELECT count(*)::int FROM lead_owners lo WHERE lo.owner_id = s.id AND lo.status = 'interested') AS interested,
       (SELECT count(*)::int FROM lead_owners lo WHERE lo.owner_id = s.id AND lo.status = 'enrolled') AS enrolled,
       (SELECT count(*)::int FROM lead_tasks t WHERE t.owner_id = s.id AND t.status = 'open') AS open_tasks,
       (SELECT count(*)::int FROM lead_tasks t WHERE t.owner_id = s.id AND ${MISSED_SQL} AND t.missed_at >= $2) AS missed,
       (SELECT count(*)::int FROM lead_tasks t WHERE t.completed_by = s.id AND t.kind IN ('call_booked', 'call_request', 'follow_up', 'meeting') AND t.status = 'done' AND t.completed_at >= $2) AS calls_done,
       (SELECT count(*)::int FROM lead_activities a WHERE a.actor_id = s.id AND a.created_at >= $2) AS actions,
       (SELECT count(*)::int FROM lead_activities a WHERE a.actor_id = s.id AND a.action IN ('report_generated', 'report_regenerated') AND a.created_at >= $2) AS reports,
       (SELECT count(*)::int FROM lead_activities a WHERE a.actor_id = s.id AND a.action IN ('email_sent', 'report_emailed') AND a.created_at >= $2) AS emails
     FROM admin_users s WHERE s.id = ANY($1::uuid[])`,
    [people.map((p) => p.id), since],
  )
  const stats = new Map(rows.map((r) => [r.id, r]))
  return people.map((person) => ({ ...(stats.get(person.id) as PersonStats), person }))
}

/**
 * Who did what on lead accounts: each action split by learner, ISM, associate, manager and admin (and system).
 * Learner actions come from the learner side's own records; staff actions from lead_activities.
 */
export async function activityMatrix(me: StaffUser, since: Date) {
  const scope = await scopeIds(me)
  const leadScope = `($1::uuid[] IS NULL OR x.user_id IN (SELECT lo.user_id FROM lead_owners lo WHERE lo.owner_id = ANY($1::uuid[])))`
  const staff = await query<{ action: string; actor_kind: ActorKind; n: number }>(
    `SELECT x.action, x.actor_kind, count(*)::int AS n FROM lead_activities x WHERE x.created_at >= $2 AND ${leadScope} GROUP BY 1, 2`,
    [scope, since],
  )
  const learner = await queryOne<Record<string, number>>(
    `SELECT
       (SELECT count(*)::int FROM users x WHERE x.created_at >= $2 AND ${leadScope.replace(/x\.user_id/g, 'x.id')}
          AND NOT EXISTS (SELECT 1 FROM lead_owners lo WHERE lo.user_id = x.id AND lo.created_by IS NOT NULL)) AS lead_created,
       (SELECT count(*)::int FROM assessments x WHERE x.updated_at >= $2 AND ${leadScope}) AS profile_updated,
       (SELECT count(*)::int FROM tool_results x WHERE x.status = 'ready' AND x.updated_at >= $2 AND ${leadScope}
          AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a.user_id = x.user_id AND a.action = 'report_generated' AND a.detail->>'tool' = x.tool)) AS report_generated,
       (SELECT count(*)::int FROM lead_events x WHERE x.type = 'report_emailed' AND x.created_at >= $2 AND ${leadScope}) AS report_emailed,
       (SELECT count(*)::int FROM counsellor_requests x WHERE x.created_at >= $2 AND ${leadScope}) AS call_booked,
       (SELECT count(*)::int FROM lead_events x WHERE x.type = 'call_requested' AND x.created_at >= $2 AND ${leadScope}) AS call_requested,
       (SELECT count(*)::int FROM lead_events x WHERE x.type = 'meeting_booked' AND x.created_at >= $2 AND ${leadScope}) AS meeting_booked`,
    [scope, since],
  )
  const actions = ['lead_created', 'allocated', 'reassigned', 'status_changed', 'profile_updated', 'report_generated', 'report_regenerated', 'report_emailed', 'email_sent', 'call_booked', 'call_requested', 'meeting_booked', 'meeting_cancelled', 'call_logged', 'task_created', 'task_done', 'note_added']
  const kinds: ActorKind[] = ['user', 'ism', 'associate', 'manager', 'admin', 'system']
  const label: Record<string, string> = { call_booked: 'Booked a call', call_requested: 'Asked for a call', lead_created: 'Created the lead / signed up' }
  return {
    kinds,
    rows: actions
      .map((a) => {
        const counts = Object.fromEntries(kinds.map((k) => [k, k === 'user' ? learner?.[a] ?? 0 : staff.find((s) => s.action === a && s.actor_kind === k)?.n ?? 0])) as Record<ActorKind, number>
        return { action: a, label: label[a] ?? actionLabel(a), counts, total: Object.values(counts).reduce((x, y) => x + y, 0) }
      })
      .filter((r) => r.total > 0),
  }
}

/** Missed calls in scope with the people who answer for each one (owner → associate → manager). */
export async function missedCalls(me: StaffUser, since: Date, limit = 100) {
  const scope = await scopeIds(me)
  const ids = byId(await staffDirectory())
  const rows = await query<TaskRow>(
    `SELECT t.*, true AS missed, u.name AS lead_name, u.email AS lead_email, coalesce(u.phone_country, '') || ' ' || coalesce(u.phone, '') AS lead_phone
       FROM lead_tasks t JOIN users u ON u.id = t.user_id
      WHERE ($1::uuid[] IS NULL OR t.owner_id = ANY($1::uuid[])) AND ${MISSED_SQL} AND t.missed_at >= $2
      ORDER BY t.missed_at DESC LIMIT $3`,
    [scope, since, limit],
  )
  return rows.map((t) => ({ ...t, chain: chainOf(t.owner_id, ids) }))
}

/** How leads reached their owners, and where they stand. */
export async function pipeline(me: StaffUser) {
  const scope = await scopeIds(me)
  const [sources, statuses] = await Promise.all([
    query<{ source: string; n: number }>(`SELECT coalesce(lo.source, 'none') AS source, count(*)::int AS n FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE ${inScope(1)} GROUP BY 1 ORDER BY 2 DESC`, [scope]),
    query<{ status: string; n: number }>(`SELECT coalesce(lo.status, 'new') AS status, count(*)::int AS n FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE ${inScope(1)} GROUP BY 1`, [scope]),
  ])
  return { sources, statuses }
}

export async function staffAudit(limit = 50) {
  const ids = byId(await staffDirectory())
  const rows = await query<{ actor_id: string | null; target_id: string | null; action: string; detail: Record<string, unknown>; created_at: Date }>(
    `SELECT actor_id, target_id, action, detail, created_at FROM staff_audit ORDER BY created_at DESC LIMIT $1`,
    [limit],
  )
  const named = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? displayName(ids.get(v)) : v)
  return rows.map((r) => ({
    ...r, detail: Object.fromEntries(Object.entries(r.detail).map(([k, v]) => [k, named(v)])),
    actor: displayName(r.actor_id ? ids.get(r.actor_id) : null), target: displayName(r.target_id ? ids.get(r.target_id) : null),
  }))
}
