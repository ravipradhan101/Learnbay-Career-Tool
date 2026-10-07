import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fmtDate } from '@/components/admin/parts'
import { ActorBadge, Chain, StatusPill, TaskTable } from '@/components/crm/parts'
import { MeetingPanel } from '@/components/crm/MeetingPanel'
import { AddTask, EmailPanel, NoteForm, ProfileForm, ReassignControl, ReportsPanel, StatusControl } from '@/components/crm/LeadActions'
import { requireStaff } from '@/lib/admin-auth'
import { leadDetail } from '@/lib/crm/data'
import { isUuid } from '@/lib/crm/guard'
import { EMAIL_TEMPLATES } from '@/lib/crm/lead-actions'
import { assignableIds, byId, canSeeLead, staffDirectory } from '@/lib/crm/scope'
import { SOURCE_LABEL } from '@/lib/crm/roles'
import { syncTasks } from '@/lib/crm/tasks'
import { isAnswered, roleLabel, experienceLabel, interestLabel, targetRoleLabel } from '@/lib/questions'
import { whenLabel } from '@/lib/sessions'
import { QUESTION_TITLES } from '@/lib/tools-meta'

export const metadata = { title: 'Lead' }

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireStaff()
  const { id } = await params
  if (!isUuid(id)) notFound()
  await syncTasks()
  const [d, dir] = await Promise.all([leadDetail(id), staffDirectory()])
  // A lead outside your scope looks exactly like one that does not exist.
  if (!d || !canSeeLead(me, d.user.owner_id, dir)) notFound()
  const created = (await searchParams).created === '1'
  const people = byId(dir)
  const u = d.user
  const assignable = dir.filter((s) => assignableIds(me, dir).has(s.id)).map((s) => ({ id: s.id, label: s.id === me.id ? `Me (${s.name ?? s.email})` : `${s.name ?? s.email} · ${s.role.toUpperCase()}` }))
  const templates = Object.entries(EMAIL_TEMPLATES).map(([tid, t]) => ({ id: tid, label: t.label, subject: t.subject, body: t.body }))
  const openTasks = d.tasks.filter((t) => t.status === 'open')
  const pastTasks = d.tasks.filter((t) => t.status !== 'open')

  return (
    <>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: '0.35rem' }}>
          <Link href="/admin/crm/leads" className="small">← Leads</Link>
          <h1 className="admin-h1">{u.name || '(no name yet)'} <StatusPill status={u.status} /></h1>
          <p className="small">
            <a href={`mailto:${u.email}`}>{u.email}</a>
            {u.phone && <> · <a href={`tel:${u.phone_country ?? ''}${u.phone}`}>{u.phone_country} {u.phone}</a></>}
          </p>
          <p className="small muted">
            Signed up {fmtDate(u.created_at)}{u.email_verified_at ? ' · email verified' : ' · email not verified yet'} · last seen {fmtDate(u.last_login_at)}
          </p>
          <p className="small">Owner: <Chain chain={d.chain} />{u.source && <span className="muted"> · {SOURCE_LABEL[u.source] ?? u.source} {fmtDate(u.assigned_at)}</span>}</p>
        </div>
        <div className="card crm-side-controls">
          <StatusControl leadId={id} status={u.status ?? 'new'} />
          {me.role !== 'ism' && <ReassignControl leadId={id} ownerId={u.owner_id} options={assignable} />}
        </div>
      </div>
      {created && <p className="crm-ok" role="status">Lead saved. Fill in their details below, then build and email their reports.</p>}

      <div className="crm-detail">
        <div className="stack">
          <section className="card stack">
            <div className="row between"><h2 className="card-title">Meetings</h2><span className="help-note">Video on Google Meet, or a phone call</span></div>
            <MeetingPanel leadId={id} meId={me.id} hosts={assignable}
              meetings={d.meetings.map((m) => ({ ...m, starts_at: new Date(m.starts_at).toISOString(), ends_at: new Date(m.ends_at).toISOString() }))} />
          </section>

          <section className="card stack">
            <h2 className="card-title">Calls and reminders</h2>
            <TaskTable tasks={openTasks} people={people} showLead={false} />
            <AddTask leadId={id} />
            {pastTasks.length > 0 && (
              <details>
                <summary className="small">Earlier calls and reminders ({pastTasks.length})</summary>
                <TaskTable tasks={pastTasks} people={people} showLead={false} canAct={false} />
              </details>
            )}
          </section>

          <section className="card stack">
            <div className="row between"><h2 className="card-title">Reports</h2><span className="help-note">Built with the same engine the learner uses</span></div>
            <ReportsPanel leadId={id} reports={d.reports.map((r) => ({ id: r.id, name: r.name, status: r.status, missing: r.questions.filter((q) => !isAnswered(d.answers, q)).map((q) => QUESTION_TITLES[q]?.title ?? q) }))} />
          </section>

          <section className="card stack">
            <h2 className="card-title">Email the lead</h2>
            <EmailPanel leadId={id} email={u.email} templates={templates} />
          </section>

          <section className="card stack">
            <div className="row between">
              <h2 className="card-title">Profile details</h2>
              <span className="help-note">{roleLabel(d.answers)} · {experienceLabel(d.answers)} · {interestLabel(d.answers)} → {targetRoleLabel(d.answers)}</span>
            </div>
            <ProfileForm leadId={id} name={u.name ?? ''} phoneCountry={u.phone_country ?? '+91'} phone={u.phone ?? ''} answers={d.answers} />
          </section>
        </div>

        <div className="stack">
          {d.bookings.length > 0 && (
            <section className="card stack">
              <h2 className="card-title">Booked calls</h2>
              <ul className="crm-list">
                {d.bookings.map((b) => (
                  <li key={b.id}><b>{b.date && b.time ? whenLabel(b.date, b.time) : 'No time'}</b> <span className="pill">{b.status}</span>{b.rescheduled > 0 && <span className="small muted"> · rescheduled {b.rescheduled}×</span>}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card stack">
            <h2 className="card-title">Notes</h2>
            <NoteForm leadId={id} />
            <ul className="crm-list">
              {d.notes.map((n) => <li key={n.id}><p className="small" style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p><span className="small muted">{n.author} · {fmtDate(n.created_at)}</span></li>)}
            </ul>
          </section>

          <section className="card stack">
            <div className="row between"><h2 className="card-title">Everything that happened</h2><span className="help-note">Who did it: learner or team</span></div>
            <ol className="crm-timeline">
              {d.timeline.map((t, i) => (
                <li key={i}>
                  <ActorBadge kind={t.actor} />
                  <div><b className="small">{t.text}</b>{t.detail && <span className="small"> · {t.detail}</span>}<div className="small muted">{t.who} · {fmtDate(t.at)}</div></div>
                </li>
              ))}
            </ol>
          </section>

          {d.assignments.length > 0 && (
            <section className="card stack">
              <h2 className="card-title">Owner history</h2>
              <ul className="crm-list">
                {d.assignments.map((a, i) => <li key={i} className="small">{fmtDate(a.created_at)}: {a.from_id ? `${a.from} → ` : ''}<b>{a.to}</b> <span className="muted">({SOURCE_LABEL[a.source] ?? a.source}, by {a.by})</span></li>)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
