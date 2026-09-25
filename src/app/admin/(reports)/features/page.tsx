import { Empty, PageHead, fmtInt, fmtPct } from '@/components/admin/parts'
import { featureName, featureUsage, parseRange } from '@/lib/admin-reports'

export const metadata = { title: 'Used vs avoided' }

export default async function FeaturesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range)
  const f = await featureUsage(range.since)
  const sorted = [...f.table].sort((a, b) => (a.useRate ?? 2) - (b.useRate ?? 2))
  const picks = f.firstPicks.reduce((s, p) => s + p.count, 0)

  return (
    <>
      <PageHead title="Used vs avoided" sub={`Learners who signed up: ${range.label.toLowerCase()} (${fmtInt(f.cohort)}). Sorted from most avoided to most used.`} range={range.key} base="/admin/features" />
      <section className="card stack">
        <p className="help-note">
          <b>Saw it</b>: the learner reached the place where the feature is offered. <b>Avoided</b>: saw it but never used it.
          <b> Never reached</b>: never got to where it is offered, which is a navigation problem rather than a lack of interest.
        </p>
        {f.cohort ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Feature</th><th>“Saw it” means</th><th className="num">Saw it</th><th className="num">Used it</th><th className="num">Avoided</th><th className="num">Use rate</th><th className="num">Never reached</th></tr></thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.name}>
                    <td><b>{r.name}</b></td><td className="muted">{r.where}</td><td className="num">{fmtInt(r.seen)}</td><td className="num">{fmtInt(r.used)}</td>
                    <td className="num">{r.avoided ? <b className="text-danger">{fmtInt(r.avoided)}</b> : '0'}</td>
                    <td className="num"><span className={`mini-bar${(r.useRate ?? 1) < 0.3 ? ' warn' : ''}`} style={{ width: `${(r.useRate ?? 0) * 4}rem` }} /> {fmtPct(r.useRate)}</td>
                    <td className="num">{fmtInt(r.neverSeen)} ({fmtPct(r.cohort ? r.neverSeen / r.cohort : null)})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No sign-ups in this period.</Empty>}
      </section>

      <section className="card stack">
        <h2 className="card-title">What learners choose to check first</h2>
        {picks ? (
          <table className="admin-table compact">
            <thead><tr><th>First choice in the pop-up</th><th className="num">Learners</th></tr></thead>
            <tbody>{f.firstPicks.map((p) => <tr key={p.tool}><td>{featureName(p.tool)}</td><td className="num">{fmtInt(p.count)} ({fmtPct(p.count / picks)})</td></tr>)}</tbody>
          </table>
        ) : <Empty>Nobody has used the first-choice pop-up in this period.</Empty>}
        <p className="small">{fmtInt(f.dismissedFirstPick)} learners closed the pop-up without choosing.</p>
      </section>
    </>
  )
}
