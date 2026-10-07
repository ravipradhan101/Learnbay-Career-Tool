import Link from 'next/link'
import { Stat, fmtDate, fmtInt } from '@/components/admin/parts'
import { Chain, TaskTable, Person } from '@/components/crm/parts'
import { NewLeadButton } from '@/components/crm/NewLeadButton'
import { requireStaff } from '@/lib/admin-auth'
import { kpis, listTasks, missedCalls, teamStats } from '@/lib/crm/data'
import { assignableIds, byId, staffDirectory } from '@/lib/crm/scope'
import { syncTasks } from '@/lib/crm/tasks'
import { TASK_KIND_LABEL } from '@/lib/crm/roles'
import { COUNTRY_CODES } from '@/lib/questions'
import { istDate } from '@/lib/sessions'

export const metadata = { title: { absolute: 'Today | Pseudo Sales CRM' } }

export default async function CrmToday() {
  const me = await requireStaff()
  await syncTasks()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const todayStart = new Date(`${istDate()}T00:00:00+05:30`)
  const [dir, k, mine, missed, team] = await Promise.all([
    staffDirectory(), kpis(me, todayStart), listTasks(me, 'due', '', true), missedCalls(me, weekAgo, 15), me.role === 'ism' ? Promise.resolve([]) : teamStats(me, weekAgo),
  ])
  const people = byId(dir)
  const assignable = dir.filter((s) => assignableIds(me, dir).has(s.id)).map((s) => ({ id: s.id, label: s.id === me.id ? `Me (${s.name ?? s.email})` : `${s.name ?? s.email} · ${s.role.toUpperCase()}` }))
  const scopeLabel = me.role === 'admin' ? 'everyone' : me.role === 'ism' ? 'your leads' : 'you and your team'

  return (
    <>
      <div className="crm-page-head">
        <div>
          <h1>Good to see you, {(me.name ?? me.email).split(/[\s@]/)[0]}</h1>
          <p className="muted small">Today at a glance for {scopeLabel}. Calls you must make are at the top.</p>
        </div>
        <NewLeadButton assignable={assignable} countries={COUNTRY_CODES.map((c) => ({ code: c.code, label: `${c.flag} ${c.code}` }))} />
      </div>

      <div className="stat-grid">
        <Stat label="Leads" value={fmtInt(k.leads ?? 0)} note={`${fmtInt(k.new_leads ?? 0)} new today`} />
        <Stat label="Due today" value={fmtInt(k.due_today ?? 0)} note={`${fmtInt(k.overdue ?? 0)} overdue`} />
        <Stat label="Missed calls today" value={fmtInt(k.missed ?? 0)} note="booked slot + 1 h, or 1 working day" />
        <Stat label="Calls done today" value={fmtInt(k.calls_done ?? 0)} />
        <Stat label="Interested" value={fmtInt(k.interested ?? 0)} note={`${fmtInt(k.enrolled ?? 0)} enrolled`} />
        {me.role === 'admin' && <Stat label="Unassigned" value={fmtInt(k.unassigned ?? 0)} note="waiting for round robin" />}
      </div>

      <section className="card stack">
        <div className="row between"><h2 className="card-title">My calls and reminders due today</h2><Link className="small" href="/admin/crm/tasks">All calls & reminders</Link></div>
        <TaskTable tasks={mine} people={people} showOwner={false} />
      </section>

      <section className="card stack">
        <div className="row between">
          <h2 className="card-title">Missed calls, last 7 days</h2>
          <Link className="small" href="/admin/crm/analytics">Trace all</Link>
        </div>
        {missed.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Lead</th><th>Call</th><th>Was due</th><th>Who answers for it</th></tr></thead>
              <tbody>
                {missed.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/admin/crm/leads/${t.user_id}`}><b>{t.lead_name || t.lead_email}</b></Link></td>
                    <td>{TASK_KIND_LABEL[t.kind]}{t.status === 'done' && <div className="small muted">done late</div>}</td>
                    <td>{fmtDate(t.missed_at)}</td>
                    <td><Chain chain={t.chain} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">No missed calls. 🎉</p>}
      </section>

      {team.length > 1 && (
        <section className="card stack">
          <div className="row between"><h2 className="card-title">Team, last 7 days</h2><Link className="small" href="/admin/crm/analytics">Full analytics</Link></div>
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Person</th><th className="num">Leads</th><th className="num">New</th><th className="num">Calls done</th><th className="num">Missed</th><th className="num">Open tasks</th><th>Last sign-in</th></tr></thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.id}>
                    <td><Person s={t.person} /></td>
                    <td className="num">{t.leads}</td><td className="num">{t.received}</td><td className="num">{t.calls_done}</td>
                    <td className="num">{t.missed ? <b className="crm-late">{t.missed}</b> : 0}</td><td className="num">{t.open_tasks}</td>
                    <td className="small">{fmtDate(t.person.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
