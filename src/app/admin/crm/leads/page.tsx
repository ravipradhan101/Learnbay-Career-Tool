import Link from 'next/link'
import { fmtDate, fmtInt } from '@/components/admin/parts'
import { NewLeadButton } from '@/components/crm/NewLeadButton'
import { DistributeButton } from '@/components/crm/DistributeButton'
import { Person, StatusPill, relative } from '@/components/crm/parts'
import { requireStaff } from '@/lib/admin-auth'
import { background } from '@/lib/background'
import { refreshScores } from '@/lib/crm/insights'
import { listLeads, PAGE_SIZE } from '@/lib/crm/data'
import { assignableIds, byId, displayName, staffDirectory, visibleIds } from '@/lib/crm/scope'
import { syncTasks } from '@/lib/crm/tasks'
import { LEAD_STATUSES, SOURCE_LABEL, isLeadStatus } from '@/lib/crm/roles'
import { COUNTRY_CODES } from '@/lib/questions'

export const metadata = { title: 'Leads' }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireStaff()
  await syncTasks()
  const sp = await searchParams
  const dir = await staffDirectory()
  const visible = visibleIds(me, dir)
  const owner = one(sp.owner)
  const f = {
    q: one(sp.q).slice(0, 80), status: isLeadStatus(one(sp.status)) ? one(sp.status) : '', owner: visible.has(owner) ? owner : '',
    unassigned: one(sp.unassigned) === '1', missed: one(sp.missed) === '1', page: Math.max(1, Number(one(sp.page)) || 1),
    band: ['hot', 'warm', 'cold'].includes(one(sp.band)) ? one(sp.band) : '', sort: one(sp.sort) === 'intent' ? 'intent' as const : 'new' as const,
  }
  const { rows, total } = await listLeads(me, f)
  // Missing or old intent scores are worked out after the page is sent; they show on the next load.
  background('crm:scores', () => refreshScores(rows))
  const people = byId(dir)
  const assignable = dir.filter((s) => assignableIds(me, dir).has(s.id)).map((s) => ({ id: s.id, label: s.id === me.id ? `Me (${s.name ?? s.email})` : `${s.name ?? s.email} · ${s.role.toUpperCase()}` }))
  const qs = (patch: Record<string, string | number>) => {
    const all = { q: f.q, status: f.status, owner: f.owner, unassigned: f.unassigned ? '1' : '', missed: f.missed ? '1' : '', band: f.band, sort: f.sort === 'intent' ? 'intent' : '', page: f.page, ...patch }
    const p = new URLSearchParams(Object.entries(all).filter(([, v]) => String(v) !== '').map(([k, v]) => [k, String(v)]))
    return `/admin/crm/leads?${p.toString()}`
  }
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="crm-page-head">
        <div>
          <h1>Leads</h1>
          <p className="muted small">{me.role === 'admin' ? 'Every lead, including unassigned ones.' : me.role === 'ism' ? 'Leads you own.' : 'Leads owned by you and your team.'} {fmtInt(total)} match.</p>
        </div>
        <div className="row">
          {me.role === 'admin' && <DistributeButton />}
          <NewLeadButton assignable={assignable} countries={COUNTRY_CODES.map((c) => ({ code: c.code, label: `${c.flag} ${c.code}` }))} />
        </div>
      </div>

      <form className="card crm-filters" method="get">
        <input className="input" name="q" defaultValue={f.q} placeholder="Name, email or phone" aria-label="Search" />
        <select className="select" name="status" defaultValue={f.status} aria-label="Status">
          <option value="">Any status</option>
          {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {visible.size > 1 && (
          <select className="select" name="owner" defaultValue={f.owner} aria-label="Owner">
            <option value="">Anyone in scope</option>
            {dir.filter((s) => visible.has(s.id)).map((s) => <option key={s.id} value={s.id}>{displayName(s)} · {s.role.toUpperCase()}{s.active ? '' : ' (inactive)'}</option>)}
          </select>
        )}
        <select className="select" name="band" defaultValue={f.band} aria-label="Intent">
          <option value="">Any intent</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
        </select>
        <select className="select" name="sort" defaultValue={f.sort === 'intent' ? 'intent' : ''} aria-label="Sort">
          <option value="">Newest first</option><option value="intent">Highest intent first</option>
        </select>
        <label className="small row" style={{ gap: '0.35rem' }}><input type="checkbox" name="missed" value="1" defaultChecked={f.missed} /> Has a missed call</label>
        {me.role === 'admin' && <label className="small row" style={{ gap: '0.35rem' }}><input type="checkbox" name="unassigned" value="1" defaultChecked={f.unassigned} /> Unassigned only</label>}
        <button className="btn btn-soft btn-sm">Filter</button>
        <Link href="/admin/crm/leads" className="small">Clear</Link>
      </form>

      <div className="table-scroll">
        <table className="admin-table crm-pin1">
          <thead><tr><th>Lead</th><th>Intent</th><th>Phone</th><th>Owner</th><th>Status</th><th>How assigned</th><th className="num">Reports</th><th>Next call / reminder</th><th>Last staff touch</th><th>Signed up</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.missed ? 'crm-missed' : undefined}>
                <td><Link href={`/admin/crm/leads/${r.id}`}><b>{r.name || '(no name)'}</b></Link><div className="small muted">{r.email}</div></td>
                <td>{r.intent === null ? <span className="small muted">—</span> : <span className={`crm-intent-mini ${r.band ?? ''}`} title={`Purchase intent ${r.intent}/100 (${r.band})`}><i aria-hidden="true" />{r.intent}</span>}</td>
                <td className="small">{r.phone ? `${r.phone_country ?? ''} ${r.phone}` : '—'}</td>
                <td><Person s={r.owner_id ? people.get(r.owner_id) : null} /></td>
                <td><StatusPill status={r.status} />{r.missed > 0 && <div><span className="pill danger">{r.missed} missed</span></div>}</td>
                <td className="small">{r.source ? SOURCE_LABEL[r.source] ?? r.source : '—'}</td>
                <td className="num">{r.reports}</td>
                <td className="small">{r.next_due ? <>{fmtDate(r.next_due)}<div className="muted">{relative(r.next_due)}</div></> : '—'}</td>
                <td className="small">{r.last_touch ? relative(r.last_touch) : 'Never'}</td>
                <td className="small">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10} className="muted">No leads match.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="row" aria-label="Pages">
          {f.page > 1 && <Link className="btn btn-ghost btn-sm" href={qs({ page: f.page - 1 })}>← Previous</Link>}
          <span className="small muted">Page {f.page} of {pages}</span>
          {f.page < pages && <Link className="btn btn-ghost btn-sm" href={qs({ page: f.page + 1 })}>Next →</Link>}
        </nav>
      )}
    </>
  )
}
