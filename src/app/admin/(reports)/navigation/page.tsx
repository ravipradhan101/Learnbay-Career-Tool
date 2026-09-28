import { Empty, PageHead, fmtInt, fmtPct, fmtSecs } from '@/components/admin/parts'
import { navigation, pageName, parseRange } from '@/lib/admin-reports'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata = { title: 'Navigation' }

export default async function NavigationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const range = parseRange((await searchParams).range)
  const nav = await navigation(range.since)
  const totalDevices = nav.devices.reduce((s, d) => s + d.visitors, 0)
  const totalEntries = nav.entries.reduce((s, e) => s + e.count, 0)

  return (
    <>
      <PageHead title="Navigation" sub={`${range.label}. How people move through the app, how long they stay and what they click.`} range={range.key} base="/admin/navigation" />

      <section className="card stack">
        <div>
          <h2 className="card-title">Pages</h2>
          <p className="card-sub">Time on page counts only while the tab is visible. Scroll depth is how far down people got on average.</p>
        </div>
        {nav.pages.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Page</th><th className="num">Views</th><th className="num">Visitors</th><th className="num">Avg time</th><th className="num">Median time</th><th className="num">Avg scroll</th></tr></thead>
              <tbody>
                {nav.pages.map((p) => (
                  <tr key={p.path}><td>{pageName(p.path)} <span className="muted small">{p.path}</span></td><td className="num">{fmtInt(p.views)}</td><td className="num">{fmtInt(p.visitors)}</td>
                    <td className="num">{fmtSecs(p.avgSeconds)}</td><td className="num">{fmtSecs(p.medianSeconds)}</td><td className="num">{p.avgScroll === null ? 'None' : `${p.avgScroll}%`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No page views in this period.</Empty>}
      </section>

      <div className="admin-grid-2">
        <section className="card stack">
          <div>
            <h2 className="card-title">Most common paths</h2>
            <p className="card-sub">Page → next page within the same visit.</p>
          </div>
          {nav.transitions.length ? (
            <table className="admin-table compact">
              <thead><tr><th>From</th><th>To</th><th className="num">Times</th></tr></thead>
              <tbody>{nav.transitions.map((t) => <tr key={`${t.from}>${t.to}`}><td>{pageName(t.from)}</td><td>{pageName(t.to)}</td><td className="num">{fmtInt(t.count)}</td></tr>)}</tbody>
            </table>
          ) : <Empty>No multi-page visits yet.</Empty>}
        </section>

        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Entry pages</h2>
            {nav.entries.length ? (
              <table className="admin-table compact">
                <thead><tr><th>First page of the visit</th><th className="num">Visits</th></tr></thead>
                <tbody>{nav.entries.map((e) => <tr key={e.path}><td>{pageName(e.path)}</td><td className="num">{fmtInt(e.count)} ({fmtPct(totalEntries ? e.count / totalEntries : null)})</td></tr>)}</tbody>
              </table>
            ) : <Empty>No visits yet.</Empty>}
          </section>
          <section className="card stack">
            <h2 className="card-title">Traffic sources</h2>
            {nav.sources.length ? (
              <table className="admin-table compact">
                <thead><tr><th>Source</th><th>Medium / campaign</th><th className="num">Visitors</th></tr></thead>
                <tbody>{nav.sources.map((s) => <tr key={`${s.source}|${s.medium}|${s.campaign}`}><td>{s.source}</td><td>{[s.medium, s.campaign].filter(Boolean).join(' / ') || 'None'}</td><td className="num">{fmtInt(s.visitors)}</td></tr>)}</tbody>
              </table>
            ) : <Empty>No first visits recorded yet.</Empty>}
            {nav.devices.length > 0 && <p className="small">Devices: {nav.devices.map((d) => `${d.device} ${fmtPct(totalDevices ? d.visitors / totalDevices : null)}`).join(' · ')}</p>}
          </section>
        </div>
      </div>

      <section className="card stack">
        <div>
          <h2 className="card-title">What people click</h2>
          <p className="card-sub">Buttons and links, by the page they were clicked on.</p>
        </div>
        {nav.clicks.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Button / link</th><th>On page</th><th>Goes to</th><th className="num">Clicks</th><th className="num">Visitors</th></tr></thead>
              <tbody>
                {nav.clicks.map((c, i) => (
                  <tr key={i}><td>{c.label}</td><td>{pageName(c.path)}</td><td className="muted">{c.href ? pageName(c.href) : 'None'}</td><td className="num">{fmtInt(c.clicks)}</td><td className="num">{fmtInt(c.visitors)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No clicks recorded in this period.</Empty>}
      </section>
    </>
  )
}
