import Link from 'next/link'
import { Empty, PageHead, Stat, fmtDate, fmtInr, fmtInt, fmtPct, fmtTokens } from '@/components/admin/parts'
import { PRICING } from '@/lib/ai-usage'
import { featureName, parseRange, tokenUsage } from '@/lib/admin-reports'

export const metadata = { title: 'AI tokens & cost' }

export default async function TokensPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const range = parseRange(params.range)
  const q = typeof params.q === 'string' ? params.q.slice(0, 100) : ''
  const t = await tokenUsage(range.since, q)
  const learners = t.users.length
  const exportHref = `/api/admin/export?report=tokens&range=${range.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`

  return (
    <>
      <PageHead title="AI tokens & cost" sub={`${range.label}. Gemini 2.5 Flash usage, measured from Google's response for every call, including retries and failures.`} range={range.key} base="/admin/tokens" />
      <div className="stat-grid">
        <Stat label="Total tokens" value={fmtTokens(t.totals.total)} note={`${fmtTokens(t.totals.prompt)} in · ${fmtTokens(t.totals.output)} out`} />
        <Stat label="Estimated cost" value={fmtInr(t.totals.costInr)} note={`at $${PRICING.inputUsdPerM}/M in, $${PRICING.outputUsdPerM}/M out, ₹${PRICING.inrPerUsd}/$`} />
        <Stat label="AI calls" value={fmtInt(t.totals.calls)} note={`${fmtInt(t.totals.failed)} failed or blocked (${fmtPct(t.totals.calls ? t.totals.failed / t.totals.calls : null)})`} />
        <Stat label="Avg cost per learner" value={learners ? fmtInr(t.users.reduce((s, u) => s + u.costInr, 0) / learners) : '—'} note={`${fmtInt(learners)} learners used AI`} />
      </div>

      <section className="card stack">
        <h2 className="card-title">By AI tool</h2>
        {t.tools.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>AI tool</th><th className="num">Calls</th><th className="num">Failed</th><th className="num">Input tokens</th><th className="num">Output + thinking</th><th className="num">Total tokens</th><th className="num">Share</th><th className="num">Est. cost</th><th className="num">Avg / call</th></tr></thead>
              <tbody>
                {t.tools.map((x) => (
                  <tr key={x.tool}><td><b>{x.tool}</b></td><td className="num">{fmtInt(x.calls)}</td><td className="num">{fmtInt(x.failed)}</td><td className="num">{fmtInt(x.prompt)}</td><td className="num">{fmtInt(x.output)}</td>
                    <td className="num">{fmtInt(x.total)}</td><td className="num">{fmtPct(t.totals.total ? x.total / t.totals.total : null)}</td><td className="num">{fmtInr(x.costInr)}</td><td className="num">{x.calls ? fmtInt(Math.round(x.total / x.calls)) : '—'}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{fmtInt(t.totals.calls)}</td><td className="num">{fmtInt(t.totals.failed)}</td><td className="num">{fmtInt(t.totals.prompt)}</td><td className="num">{fmtInt(t.totals.output)}</td><td className="num">{fmtInt(t.totals.total)}</td><td className="num">100%</td><td className="num">{fmtInr(t.totals.costInr)}</td><td /></tr></tfoot>
            </table>
          </div>
        ) : <Empty>No AI calls in this period.</Empty>}
        {t.features.some((f) => f.feature.startsWith('assistant:')) && (
          <details>
            <summary className="small">AI chat by page, with thinking tokens and speed</summary>
            <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
              <table className="admin-table compact">
                <thead><tr><th>Feature</th><th className="num">Calls</th><th className="num">Learners</th><th className="num">Input</th><th className="num">Output</th><th className="num">Thinking</th><th className="num">Avg latency</th><th className="num">Est. cost</th></tr></thead>
                <tbody>
                  {t.features.map((f) => (
                    <tr key={f.feature}><td>{featureName(f.feature)}</td><td className="num">{fmtInt(f.calls)}</td><td className="num">{fmtInt(f.users)}</td><td className="num">{fmtInt(f.prompt)}</td><td className="num">{fmtInt(f.output)}</td>
                      <td className="num">{fmtInt(f.thought)}</td><td className="num">{(f.avgLatencyMs / 1000).toFixed(1)}s</td><td className="num">{fmtInr(f.costInr)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      <section className="card stack">
        <div className="row between">
          <div><h2 className="card-title">By learner</h2><p className="card-sub">Highest usage first (top 300). Click a name to see that learner’s full journey.</p></div>
          <a className="btn btn-outline btn-sm" href={exportHref}>Export CSV</a>
        </div>
        <form className="row" action="/admin/tokens">
          <input type="hidden" name="range" value={range.key} />
          <label className="sr-only" htmlFor="tok-q">Search learners</label>
          <input id="tok-q" name="q" className="input" style={{ maxWidth: '22rem' }} placeholder="Search name or email" defaultValue={q} />
          <button className="btn btn-outline">Search</button>
        </form>
        {t.users.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Learner</th><th className="num">Calls</th><th className="num">Skill Gap</th><th className="num">Salary</th><th className="num">Roadmap</th><th className="num">Resume</th><th className="num">AI chat</th><th className="num">Total tokens</th><th className="num">Est. cost</th><th>Last used</th></tr></thead>
              <tbody>
                {t.users.map((u) => (
                  <tr key={u.id}>
                    <td><Link href={`/admin/users/${u.id}`}>{u.name || u.email}</Link><div className="muted small">{u.email}</div></td>
                    <td className="num">{fmtInt(u.calls)}</td><td className="num">{fmtInt(u.skillGap)}</td><td className="num">{fmtInt(u.salary)}</td><td className="num">{fmtInt(u.roadmap)}</td>
                    <td className="num">{fmtInt(u.resume)}</td><td className="num">{fmtInt(u.assistant)}</td><td className="num"><b>{fmtInt(u.total)}</b></td><td className="num">{fmtInr(u.costInr)}</td><td>{fmtDate(u.lastUsed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>{q ? 'No learners match that search.' : 'No learner AI usage in this period.'}</Empty>}
        {t.anonymous.calls > 0 && <p className="help-note">{fmtInt(t.anonymous.calls)} calls ({fmtTokens(t.anonymous.total)} tokens) are not linked to a learner.</p>}
      </section>

      <section className="card stack">
        <h2 className="card-title">By day (IST)</h2>
        {t.daily.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Day</th><th className="num">Calls</th><th className="num">Tokens</th><th className="num">Est. cost</th></tr></thead>
              <tbody>{t.daily.map((d) => <tr key={d.day}><td>{d.day}</td><td className="num">{fmtInt(d.calls)}</td><td className="num">{fmtInt(d.total)}</td><td className="num">{fmtInr(d.costInr)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <Empty>No AI calls in this period.</Empty>}
        <p className="help-note">Costs are estimates from Google’s list prices; your Google Cloud bill is the final figure. Set GEMINI_INPUT_USD_PER_M, GEMINI_OUTPUT_USD_PER_M and INR_PER_USD in .env to match your contract. Token tracking started with this release, so earlier AI calls are not included.</p>
      </section>
    </>
  )
}
