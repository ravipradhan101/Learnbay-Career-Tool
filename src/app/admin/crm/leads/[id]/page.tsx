import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fmtDate } from '@/components/admin/parts'
import { ActorBadge, Chain, StatusPill, TaskTable } from '@/components/crm/parts'
import { MeetingPanel } from '@/components/crm/MeetingPanel'
import { LeadInsights } from '@/components/crm/LeadInsights'
import { LeadPlan } from '@/components/crm/LeadPlan'
import { AddTask, EmailPanel, NoteForm, ReassignControl, ReportsPanel } from '@/components/crm/LeadActions'
import { requireStaff } from '@/lib/admin-auth'
import { queryOne } from '@/lib/db'
import { leadDetail } from '@/lib/crm/data'
import { isUuid } from '@/lib/crm/guard'
import { leadInsights } from '@/lib/crm/insights'
import { EMAIL_TEMPLATES } from '@/lib/crm/lead-actions'
import { assignableIds, byId, canSeeLead, staffDirectory } from '@/lib/crm/scope'
import { SOURCE_LABEL } from '@/lib/crm/roles'
import { syncTasks } from '@/lib/crm/tasks'
import {
  CITIES, COMPANY_TYPES, CTC_BANDS, EDU_LEVELS, PROGRAMMER, SKILLS, TIMELINES, WEEKLY_HOURS,
  domainLabel, experienceLabel, goalLabel, interestLabel, labelOf, roleLabel, targetRoleLabel, type Answers,
} from '@/lib/questions'
import { whenLabel } from '@/lib/sessions'
import { QUESTION_TITLES } from '@/lib/tools-meta'

export const metadata = { title: 'Lead' }

const SECTIONS = [['insights', 'Intelligence'], ['plan', 'Plan & reports'], ['work', 'Calls & meetings'], ['notes', 'Notes & email'], ['activity', 'Activity'], ['profile', 'Profile']] as const

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireStaff()
  const { id } = await params
  if (!isUuid(id)) notFound()
  await syncTasks()
  const [d, dir] = await Promise.all([leadDetail(id), staffDirectory()])
  // A lead outside your scope looks exactly like one that does not exist.
  if (!d || !canSeeLead(me, d.user.owner_id, dir)) notFound()
  const [intel, external] = await Promise.all([
    leadInsights(id),
    queryOne<{ crm_id: string | null; existed: boolean; matched_by: string | null }>(`SELECT crm_id, existed, matched_by FROM lead_external WHERE user_id = $1`, [id]),
  ])
  const created = (await searchParams).created === '1'
  const people = byId(dir)
  const u = d.user
  const assignable = dir.filter((s) => assignableIds(me, dir).has(s.id)).map((s) => ({ id: s.id, label: s.id === me.id ? `Me (${s.name ?? s.email})` : `${s.name ?? s.email} · ${s.role.toUpperCase()}` }))
  const templates = Object.entries(EMAIL_TEMPLATES).map(([tid, t]) => ({ id: tid, label: t.label, subject: t.subject, body: t.body }))
  const openTasks = d.tasks.filter((t) => t.status === 'open')
  const pastTasks = d.tasks.filter((t) => t.status !== 'open')

  return (
    <div className="crm-lead">
      <Link href="/admin/crm/leads" className="crm-back">← All leads</Link>

      <header className="crm-hero">
        <div className="crm-hero-main">
          <div className="crm-avatar" aria-hidden="true">{(u.name || u.email).slice(0, 1).toUpperCase()}</div>
          <div className="crm-hero-text">
            <h1>{u.name || '(no name yet)'} <StatusPill status={u.status} /></h1>
            <p className="crm-contact">
              <a href={`mailto:${u.email}`}>{u.email}</a>
              {u.phone && <a href={`tel:${u.phone_country ?? ''}${u.phone}`}>{u.phone_country} {u.phone}</a>}
            </p>
            <p className="crm-faint">
              {roleLabel(d.answers)} · {experienceLabel(d.answers)} · {interestLabel(d.answers)} → {targetRoleLabel(d.answers)}
            </p>
            <p className="crm-faint">
              Signed up {fmtDate(u.created_at)}{u.email_verified_at ? ' · email verified' : ' · email not verified'} · last seen {fmtDate(u.last_login_at)}
              {external && <> · Main CRM: {external.existed ? `already there (matched by ${external.matched_by})` : 'new record'}{external.crm_id ? ` #${external.crm_id}` : ''}</>}
            </p>
            <p className="crm-owner">Owner: <Chain chain={d.chain} />{u.owner_id
              ? u.source && <span className="crm-faint"> · {SOURCE_LABEL[u.source] ?? u.source} {fmtDate(u.assigned_at)}</span>
              : <span className="crm-faint"> · waiting for the next available ISM</span>}</p>
          </div>
        </div>
        <div className="crm-hero-side">
          {intel && <a href="#insights" className={`crm-intent-pill ${intel.intent.band}`}><b>{intel.intent.score}</b><span>intent · {intel.intent.band}</span></a>}
          {me.role !== 'ism' && <ReassignControl leadId={id} ownerId={u.owner_id} options={assignable} />}
        </div>
      </header>
      {created && <p className="crm-ok" role="status">Lead saved. Fill in their details below, then build and email their reports.</p>}

      <nav className="crm-jump" aria-label="On this page">
        {SECTIONS.map(([sid, label]) => <a key={sid} href={`#${sid}`}>{label}</a>)}
      </nav>

      {intel && <LeadInsights leadId={id} initial={{ intent: intel.intent, summary: intel.summary, generatedAt: intel.generatedAt ? new Date(intel.generatedAt).toISOString() : null, stale: intel.stale }} />}
      {intel && <LeadPlan leadId={id} path={intel.plan.path} skillGap={intel.plan.skillGap} roadmap={intel.plan.roadmap} salary={intel.plan.salary} test={intel.plan.test} attempts={intel.plan.attempts} />}

      <div className="crm-two" id="work">
        <div className="crm-col">
          <section className="crm-panel">
            <div className="crm-panel-head"><h2>Meetings</h2><span className="crm-faint">Video on Google Meet, or a phone call</span></div>
            <MeetingPanel leadId={id} meId={me.id} hosts={assignable}
              meetings={d.meetings.map((m) => ({ ...m, starts_at: new Date(m.starts_at).toISOString(), ends_at: new Date(m.ends_at).toISOString() }))} />
          </section>

          <section className="crm-panel">
            <div className="crm-panel-head"><h2>Calls and reminders</h2></div>
            <TaskTable tasks={openTasks} people={people} showLead={false} />
            <AddTask leadId={id} />
            {pastTasks.length > 0 && (
              <details>
                <summary className="small">Earlier calls and reminders ({pastTasks.length})</summary>
                <TaskTable tasks={pastTasks} people={people} showLead={false} canAct={false} />
              </details>
            )}
          </section>

          <section className="crm-panel">
            <div className="crm-panel-head"><h2>Reports</h2><span className="crm-faint">Rebuild with answers from the call, then email them</span></div>
            <ReportsPanel leadId={id} answers={d.answers} titles={Object.fromEntries(Object.entries(QUESTION_TITLES).map(([k, v]) => [k, v.title]))}
              reports={d.reports.map((r) => ({ id: r.id, name: r.name, status: r.status, updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null, builtBy: r.builtBy, versions: r.versions, questions: r.questions, staffAnswers: r.staffAnswers }))} />
          </section>
        </div>

        <div className="crm-col">
          {d.bookings.length > 0 && (
            <section className="crm-panel">
              <div className="crm-panel-head"><h2>Booked calls</h2></div>
              <ul className="crm-list">
                {d.bookings.map((b) => (
                  <li key={b.id}><b>{b.date && b.time ? whenLabel(b.date, b.time) : 'No time'}</b> <span className="pill">{b.status}</span>{b.rescheduled > 0 && <span className="small muted"> · rescheduled {b.rescheduled}×</span>}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="crm-panel" id="notes">
            <div className="crm-panel-head"><h2>Notes</h2></div>
            <NoteForm leadId={id} />
            <ul className="crm-list">
              {d.notes.map((n) => <li key={n.id}><p className="small" style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p><span className="small muted">{n.author} · {fmtDate(n.created_at)}</span></li>)}
            </ul>
          </section>

          <section className="crm-panel">
            <div className="crm-panel-head"><h2>Email the lead</h2></div>
            <EmailPanel leadId={id} email={u.email} templates={templates} />
          </section>
        </div>
      </div>

      <div className="crm-two">
        <section className="crm-panel" id="activity">
          <div className="crm-panel-head"><h2>Activity log</h2><span className="crm-faint">Learner and team, newest first (read-only)</span></div>
          <ol className="crm-timeline">
            {d.timeline.map((t, i) => (
              <li key={i}>
                <ActorBadge kind={t.actor} />
                <div><b className="small">{t.text}</b>{t.detail && <span className="small"> · {t.detail}</span>}<div className="small muted">{t.who} · {fmtDate(t.at)}</div></div>
              </li>
            ))}
          </ol>
          {d.assignments.length > 0 && (
            <details className="crm-owner-history">
              <summary className="small">Owner history ({d.assignments.length})</summary>
              <ul className="crm-list">
                {d.assignments.map((a, i) => <li key={i} className="small">{fmtDate(a.created_at)}: {a.from_id ? `${a.from} → ` : ''}<b>{a.to}</b> <span className="muted">({SOURCE_LABEL[a.source] ?? a.source}, by {a.by})</span></li>)}
              </ul>
            </details>
          )}
        </section>

        <section className="crm-panel" id="profile">
          <div className="crm-panel-head"><h2>Profile</h2><span className="crm-faint">What they told us on Career Studio (read-only)</span></div>
          <ProfileView answers={d.answers} />
        </section>
      </div>
    </div>
  )
}

/** The learner's answers, read-only: the profile belongs to the learner (and the main CRM), not to this screen. */
function ProfileView({ answers: a }: { answers: Answers }) {
  const rows: [string, string | undefined][] = [
    ['Current role', roleLabel(a)], ['Experience', experienceLabel(a)], ['Codes?', labelOf(PROGRAMMER, a.programmer)], ['Education', labelOf(EDU_LEVELS, a.eduLevel)],
    ['Industry', domainLabel(a)], ['Company type', labelOf(COMPANY_TYPES, a.companyType)], ['Interested in', interestLabel(a)], ['Goal', goalLabel(a)],
    ['Target role', targetRoleLabel(a)], ['Skills', a.skills?.length ? a.skills.map((x) => labelOf(SKILLS, x) ?? x).join(', ') : undefined],
    ['Current CTC', labelOf(CTC_BANDS, a.ctc)], ['City', labelOf(CITIES, a.city)], ['Hours a week', labelOf(WEEKLY_HOURS, a.weeklyHours)], ['Timeline', labelOf(TIMELINES, a.timeline)],
    ['Tools they use', a.toolsUsed], ['Problem they want AI to solve', a.workProblem],
  ]
  return (
    <dl className="crm-facts">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={!v || v === 'Not specified' ? 'crm-faint' : undefined}>{v || 'Not given'}</dd></div>)}
    </dl>
  )
}
