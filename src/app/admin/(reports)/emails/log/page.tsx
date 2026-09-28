import Link from 'next/link'
import { Empty, fmtDate } from '@/components/admin/parts'
import { sendLog } from '@/lib/email/reports'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata = { title: 'Email send log' }

const FILTERS = [['', 'All'], ['sent', 'Sent'], ['skipped', 'Skipped'], ['failed', 'Failed'], ['test', 'Tests']] as const

export default async function EmailLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const p = await searchParams
  const status = typeof p.status === 'string' ? p.status : ''
  const rows = await sendLog(status)
  return (
    <>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <p className="small"><Link href="/admin/emails">← Email automation</Link></p>
          <h1 className="admin-h1">Send log</h1>
          <p className="muted small">The latest 200 automation emails. “Skipped” means the email&apos;s conditions weren&apos;t met, so the flow moved on.</p>
        </div>
        <nav className="range-pills" aria-label="Filter">{FILTERS.map(([k, l]) => <Link key={k} href={k ? `/admin/emails/log?status=${k}` : '/admin/emails/log'} aria-current={status === k ? 'true' : undefined}>{l}</Link>)}</nav>
      </div>
      <section className="card stack">
        {rows.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>When</th><th>To</th><th>Flow</th><th>Subject</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="small">{fmtDate(r.created_at)}</td>
                    <td className="small">{r.user_id ? <Link href={`/admin/users/${r.user_id}`}>{r.to_email}</Link> : r.to_email}</td>
                    <td className="small">{r.flow_name ?? 'None'}</td>
                    <td className="small">{r.subject}</td>
                    <td><span className={`pill ${r.status === 'sent' ? 'success' : r.status === 'failed' ? 'danger' : r.status === 'test' ? 'primary' : ''}`}>{r.status}</span></td>
                    <td className="small muted">{r.reason ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Nothing here yet.</Empty>}
      </section>
    </>
  )
}
