import Link from 'next/link'
import { PageHead, Stat, fmtDate, fmtInt, fmtPct } from '@/components/admin/parts'
import { ActorBadge, Chain, Person } from '@/components/crm/parts'
import { requireStaff } from '@/lib/admin-auth'
import { parseRange } from '@/lib/admin-reports'
import { activityMatrix, kpis, missedCalls, pipeline, teamStats } from '@/lib/crm/data'
import { LEAD_STATUSES, SOURCE_LABEL, TASK_KIND_LABEL, ROLE_ORDER } from '@/lib/crm/roles'
import { syncTasks } from '@/lib/crm/tasks'

export const metadata = { title: 'Analytics' }

export default async function CrmAnalytics({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireStaff()
  await syncTasks()
  const range = parseRange((await searchParams).range)
  const [k, team, matrix, missed, pipe] = await Promise.all([
    kpis(me, range.since), teamStats(me, range.since), activityMatrix(me, range.since), missedCalls(me, range.since, 200), pipeline(me),
  ])
  team.sort((a, b) => ROLE_ORDER.indexOf(a.person.role) - ROLE_ORDER.indexOf(b.person.role))
  const totalStatus = pipe.statuses.reduce((x, s) => x + s.n, 0)
  const callsTotal = (k.calls_done ?? 0) + (k.missed ?? 0)

  return (
    <>
      <PageHead title="Analytics" sub={`${range.label}. ${me.role === 'admin' ? 'The whole team.' : me.role === 'ism' ? 'Your own work.' : 'You and everyone under you.'}`} range={range.key} base="/admin/crm/analytics" />
      <div className="stat-grid">
        <Stat label="Leads in scope" value={fmtInt(k.leads ?? 0)} note={`${fmtInt(k.new_leads ?? 0)} new in this period`} />
        <Stat label="Contacted" value={fmtInt(k.contacted ?? 0)} note={k.leads ? `${fmtPct((k.contacted ?? 0) / k.leads)} of leads` : undefined} />
        <Stat label="Interested" value={fmtInt(k.interested ?? 0)} />
        <Stat label="Enrolled" value={fmtInt(k.enrolled ?? 0)} />
        <Stat label="Calls done" value={fmtInt(k.calls_done ?? 0)} />
        <Stat label="Missed calls" value={fmtInt(k.missed ?? 0)} note={callsTotal ? `${fmtPct((k.missed ?? 0) / callsTotal)} of calls due` : undefined} />
        <Stat label="Overdue now" value={fmtInt(k.overdue ?? 0)} />
      </div>

      <section className="card stack">
        <div className="row between"><h2 className="card-title">People</h2><span className="help-note">“New” = leads they received in this period. Missed calls are charged to whoever owned the call when it was due.</span></div>
        <div className="table-scroll">
          <table className="admin-table crm-pin1">
            <thead><tr><th>Person</th><th>Reports to</th><th className="num">Leads</th><th className="num">New</th><th className="num">Contacted</th><th className="num">Interested</th><th className="num">Enrolled</th><th className="num">Calls done</th><th className="num">Missed</th><th className="num">Open tasks</th><th className="num">Reports built</th><th className="num">Emails</th><th className="num">All actions</th><th>Last sign-in</th></tr></thead>
            <tbody>
              {team.map((t) => {
                const parent = t.person.associate_id ?? t.person.manager_id
                const p = team.find((x) => x.id === parent)?.person
                return (
                  <tr key={t.id}>
                    <td><Person s={t.person} /></td>
                    <td className="small">{p ? <Person s={p} role={false} /> : t.person.role === 'associate' ? 'Independent ★' : '—'}</td>
                    <td className="num">{t.leads}</td><td className="num">{t.received}</td><td className="num">{t.contacted}</td><td className="num">{t.interested}</td><td className="num">{t.enrolled}</td>
                    <td className="num">{t.calls_done}</td><td className="num">{t.missed ? <b className="crm-late">{t.missed}</b> : 0}</td><td className="num">{t.open_tasks}</td>
                    <td className="num">{t.reports}</td><td className="num">{t.emails}</td><td className="num">{t.actions}</td>
                    <td className="small">{fmtDate(t.person.last_login_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <div className="row between"><h2 className="card-title">Who did what on lead accounts</h2><span className="help-note">Learner = the person themselves in Career Studio</span></div>
        {matrix.rows.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Action</th>{matrix.kinds.map((kd) => <th key={kd} className="num"><ActorBadge kind={kd} /></th>)}<th className="num">Total</th></tr></thead>
              <tbody>
                {matrix.rows.map((r) => (
                  <tr key={r.action}><td>{r.label}</td>{matrix.kinds.map((kd) => <td key={kd} className="num">{r.counts[kd] || <span className="muted">0</span>}</td>)}<td className="num"><b>{r.total}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">No activity in this period.</p>}
      </section>

      <div className="admin-grid-2">
        <section className="card stack">
          <h2 className="card-title">Pipeline</h2>
          <div className="funnel">
            {LEAD_STATUSES.map((s) => {
              const n = pipe.statuses.find((x) => x.status === s.id)?.n ?? 0
              return (
                <div className="funnel-row" key={s.id}>
                  <span>{s.label}</span>
                  <div className="funnel-bar" aria-hidden="true"><i style={{ width: `${totalStatus ? (n / totalStatus) * 100 : 0}%` }} /></div>
                  <span className="funnel-meta"><b>{fmtInt(n)}</b> <span className="muted small">{totalStatus ? fmtPct(n / totalStatus) : ''}</span></span>
                </div>
              )
            })}
          </div>
        </section>
        <section className="card stack">
          <h2 className="card-title">How leads were assigned</h2>
          <ul className="crm-list">
            {pipe.sources.map((s) => <li key={s.source} className="row between"><span>{s.source === 'none' ? 'Not assigned yet' : SOURCE_LABEL[s.source] ?? s.source}</span><b>{fmtInt(s.n)}</b></li>)}
          </ul>
        </section>
      </div>

      <section className="card stack">
        <div className="row between"><h2 className="card-title">Missed calls, traced</h2><span className="help-note">Owner → associate → manager at the time</span></div>
        {missed.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Lead</th><th>Call</th><th>Was due by</th><th>Then</th><th>Who answers for it</th></tr></thead>
              <tbody>
                {missed.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/admin/crm/leads/${t.user_id}`}><b>{t.lead_name || t.lead_email}</b></Link></td>
                    <td>{TASK_KIND_LABEL[t.kind]}</td>
                    <td className="small">{fmtDate(t.missed_at)}</td>
                    <td className="small">{t.status === 'open' ? <span className="pill danger">Still not called</span> : `Done late ${fmtDate(t.completed_at)}`}</td>
                    <td><Chain chain={t.chain} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">No missed calls in this period.</p>}
      </section>
    </>
  )
}
