import { Empty, Funnel, PageHead, fmtInt, fmtPct, fmtSecs } from '@/components/admin/parts'
import { STEP_NAMES, acquisitionFunnel, activationFunnel, dropOffs, featureName, pageName, parseRange } from '@/lib/admin-reports'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata = { title: 'Funnel & drop-off' }

export default async function FunnelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const range = parseRange((await searchParams).range)
  const [acq, act, d] = await Promise.all([acquisitionFunnel(range.since), activationFunnel(range.since), dropOffs(range.since)])
  const exitTotal = d.onboardingExit.reduce((s, x) => s + x.visitors, 0)
  const maxField = Math.max(1, ...d.contactFields.map((f) => f.focused))

  return (
    <>
      <PageHead title="Funnel & drop-off" sub={`${range.label}. Where people stop, and at which question.`} range={range.key} base="/admin/funnel" />

      <div className="admin-grid-2">
        <section className="card stack">
          <h2 className="card-title">Visitor journey (before sign-up)</h2>
          <Funnel steps={acq} />
        </section>
        <section className="card stack">
          <h2 className="card-title">Learners who signed up in this period</h2>
          <Funnel steps={act} />
        </section>
      </div>

      <div className="admin-grid-2">
        <section className="card stack">
          <div>
            <h2 className="card-title">Where quick-start quitters stopped</h2>
            <p className="card-sub">The last question each visitor saw before leaving without submitting.</p>
          </div>
          <p className="small"><b>{fmtInt(d.landingOnly)}</b> visitors saw the landing page and left without starting or logging in.</p>
          {d.onboardingExit.length ? (
            <table className="admin-table compact">
              <thead><tr><th>Last question seen</th><th className="num">Visitors</th><th className="num">Share</th></tr></thead>
              <tbody>
                {d.onboardingExit.map((x) => (
                  <tr key={x.step}><td>{STEP_NAMES[x.step] ?? x.step}</td><td className="num">{fmtInt(x.visitors)}</td>
                    <td className="num"><span className="mini-bar warn" style={{ width: `${(x.visitors / exitTotal) * 4}rem` }} /> {fmtPct(x.visitors / exitTotal)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No abandoned quick starts in this period.</Empty>}
        </section>

        <section className="card stack">
          <div>
            <h2 className="card-title">Contact form: how far people get</h2>
            <p className="card-sub">Visitors who clicked into each field (what they type is never recorded), and the validation errors they hit.</p>
          </div>
          <table className="admin-table compact">
            <thead><tr><th>Field</th><th className="num">Visitors who reached it</th></tr></thead>
            <tbody>
              {d.contactFields.map((f) => (
                <tr key={f.field}><td>{f.label}</td><td className="num"><span className="mini-bar" style={{ width: `${(f.focused / maxField) * 5}rem` }} /> {fmtInt(f.focused)}</td></tr>
              ))}
            </tbody>
          </table>
          {d.contactErrors.length > 0 && (
            <p className="small">Errors hit: {d.contactErrors.map((e) => `${e.field} (${fmtInt(e.visitors)})`).join(' · ')}</p>
          )}
        </section>
      </div>

      <section className="card stack">
        <div>
          <h2 className="card-title">Tool questions: drop-off per question</h2>
          <p className="card-sub">Each tool asks only what it still needs. “Stopped here” = saw the question but never answered it.</p>
        </div>
        {Object.keys(d.toolSteps).length ? (
          <div className="admin-grid-2">
            {Object.entries(d.toolSteps).map(([tool, steps]) => (
              <div key={tool} className="table-scroll">
                <table className="admin-table compact">
                  <thead><tr><th>{featureName(tool)}</th><th className="num">Saw</th><th className="num">Answered</th><th className="num">Stopped here</th><th className="num">Went back</th></tr></thead>
                  <tbody>
                    {steps.map((s) => {
                      const stopped = Math.max(0, s.viewed - s.answered)
                      return (
                        <tr key={s.q}><td>{STEP_NAMES[s.q] ?? s.q}</td><td className="num">{fmtInt(s.viewed)}</td><td className="num">{fmtInt(s.answered)}</td>
                          <td className="num">{stopped ? <b className="text-danger">{fmtInt(stopped)} ({fmtPct(s.viewed ? stopped / s.viewed : null)})</b> : '0'}</td><td className="num">{fmtInt(s.back)}</td></tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : <Empty>No tool questions answered in this period.</Empty>}
        {d.toolGeneration.length > 0 && (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Tool</th><th className="num">Started generating</th><th className="num">Saw the result</th><th className="num">Failures</th><th className="num">Avg wait</th></tr></thead>
              <tbody>
                {d.toolGeneration.map((t) => (
                  <tr key={t.tool}><td>{featureName(t.tool)}</td><td className="num">{fmtInt(t.started)}</td><td className="num">{fmtInt(t.ready)} ({fmtPct(t.started ? t.ready / t.started : null)})</td>
                    <td className="num">{fmtInt(t.failed)}</td><td className="num">{fmtSecs(t.avgWaitSeconds)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card stack">
        <div>
          <h2 className="card-title">Exit pages</h2>
          <p className="card-sub">The last page of each visit. A high exit rate on a page that should lead somewhere is a sign of disinterest. Bounce = the only page in the visit.</p>
        </div>
        {d.exits.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Page</th><th className="num">Views</th><th className="num">Visits ended here</th><th className="num">Exit rate</th><th className="num">Bounces</th></tr></thead>
              <tbody>
                {d.exits.map((e) => (
                  <tr key={e.path}><td>{pageName(e.path)} <span className="muted small">{e.path}</span></td><td className="num">{fmtInt(e.views)}</td><td className="num">{fmtInt(e.exits)}</td>
                    <td className="num">{fmtPct(e.views ? e.exits / e.views : null)}</td><td className="num">{fmtInt(e.bounces)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No visits recorded in this period.</Empty>}
      </section>
    </>
  )
}
