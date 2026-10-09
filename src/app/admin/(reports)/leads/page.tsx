import type { Metadata } from 'next'
import Link from 'next/link'
import { listLeads } from '@/lib/leads'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = { title: 'Leads' }

const fmt = (d: Date | string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.slice(0, 100) : ''
  const leads = await listLeads(q)
  const count = (f: (l: (typeof leads)[number]) => boolean) => leads.filter(f).length
  const cols: [string, (l: (typeof leads)[number]) => React.ReactNode][] = [
    ['Created', (l) => fmt(l.createdAt)], ['Name', (l) => <Link href={`/admin/users/${l.id}`}>{l.name || '—'}</Link>], ['Email', (l) => <>{l.email}{!l.verified && <span className="pill warning" style={{ marginLeft: '0.375rem' }}>Unconfirmed</span>}{l.emailsOff && <span className="pill" style={{ marginLeft: '0.375rem' }}>Unsubscribed</span>}</>], ['Phone', (l) => l.phone || '—'],
    ['Score', (l) => <span className={`pill ${l.temperature === 'Hot' ? 'danger' : l.temperature === 'Warm' ? 'warning' : ''}`}>{l.score} {l.temperature}</span>],
    ['Role', (l) => l.role], ['Exp', (l) => l.experience], ['Codes', (l) => l.codes], ['Interest', (l) => l.interest], ['Target', (l) => l.targetRole],
    ['CTC', (l) => l.ctc], ['City', (l) => l.city], ['Timeline', (l) => l.timeline], ['Tools done', (l) => l.tools || '—'],
    ['Readiness', (l) => l.readiness ?? '—'], ['Program', (l) => l.program], ['Resume', (l) => l.resumeScore ?? '—'], ['Eligibility', (l) => (l.eligibilityScore === null ? '—' : `${l.eligibilityScore}/100`)], ['Chats', (l) => l.chatQuestions],
    ['Session', (l) => l.session || '—'], ['Engagement', (l) => l.events || '—'], ['Source', (l) => l.source || '—'],
  ]
  return (
    <>
      <div className="row between">
        <div><h1 className="admin-h1">Career Studio leads</h1><p className="muted small">Newest first. Up to 500{q ? ` matching “${q}”` : ''}. Click a name to see that learner’s journey.</p></div>
        <a className="btn btn-primary btn-sm" href={`/api/admin/leads${q ? `?q=${encodeURIComponent(q)}` : ''}`}>Export CSV</a>
      </div>
      <div className="stat-grid">
        <div className="stat"><span className="small muted">Leads</span><b>{leads.length}</b></div>
        <div className="stat"><span className="small muted">Used a tool</span><b>{count((l) => Boolean(l.tools))}</b></div>
        <div className="stat"><span className="small muted">Hot leads</span><b>{count((l) => l.temperature === 'Hot')}</b></div>
        <div className="stat"><span className="small muted">Session requests</span><b>{count((l) => Boolean(l.session))}</b></div>
      </div>
      <form className="row" action="/admin/leads">
        <label className="sr-only" htmlFor="admin-q">Search leads</label>
        <input id="admin-q" name="q" className="input" style={{ maxWidth: '22rem' }} placeholder="Search name, email or phone" defaultValue={q} />
        <button className="btn btn-outline">Search</button>
      </form>
      <div className="table-scroll" style={{ background: 'var(--surface)' }}>
        <table className="admin-table pin-2">
          <thead><tr>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {leads.map((l) => <tr key={l.id}>{cols.map(([h, get]) => <td key={h}>{get(l)}</td>)}</tr>)}
            {leads.length === 0 && <tr><td colSpan={cols.length} className="muted">No leads yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
