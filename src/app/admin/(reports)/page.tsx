import Link from 'next/link'
import { Funnel, PageHead, Stat, fmtInr, fmtInt, fmtPct, fmtSecs, fmtTokens } from '@/components/admin/parts'
import { acquisitionFunnel, activationFunnel, featureUsage, overview, parseRange, tokenUsage, type FunnelStep } from '@/lib/admin-reports'

export const metadata = { title: 'Overview' }

/** Largest step-to-step loss in a funnel (ignoring optional steps). */
function worstDrop(steps: FunnelStep[]) {
  let worst: { from: string; to: string; lost: number; rate: number } | null = null
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].note === 'Optional step') continue
    let p = i - 1
    while (p > 0 && steps[p].note === 'Optional step') p--
    const prev = steps[p].count
    const lost = prev - steps[i].count
    if (prev >= 5 && lost > 0 && (!worst || lost / prev > worst.rate)) worst = { from: steps[p].label, to: steps[i].label, lost, rate: lost / prev }
  }
  return worst
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range)
  const [o, acq, act, feats, tokens] = await Promise.all([
    overview(range.since), acquisitionFunnel(range.since), activationFunnel(range.since), featureUsage(range.since), tokenUsage(range.since, ''),
  ])

  const insights: { text: string; good?: boolean }[] = []
  const a = worstDrop(acq)
  if (a) insights.push({ text: `Biggest public drop-off: ${fmtPct(a.rate)} of visitors stop between “${a.from}” and “${a.to}” (${fmtInt(a.lost)} people).` })
  const b = worstDrop(act)
  if (b) insights.push({ text: `After sign-up, the biggest drop is between “${b.from}” and “${b.to}”: ${fmtPct(b.rate)} (${fmtInt(b.lost)} learners).` })
  const avoided = feats.table.filter((f) => f.seen >= 5 && f.useRate !== null).sort((x, y) => (x.useRate ?? 1) - (y.useRate ?? 1))[0]
  if (avoided) insights.push({ text: `Most avoided: “${avoided.name}”. ${fmtPct(avoided.useRate)} of the ${fmtInt(avoided.seen)} learners who saw it used it.` })
  const topTool = tokens.tools[0]
  if (topTool) insights.push({ text: `Largest AI cost: ${topTool.tool}, ${fmtTokens(topTool.total)} tokens (≈${fmtInr(topTool.costInr)}, ${fmtPct(tokens.totals.total ? topTool.total / tokens.totals.total : null)} of all tokens).` })
  if (o.signups && o.sessionsBooked) insights.push({ good: true, text: `${fmtInt(o.sessionsBooked)} 1:1 sessions booked from ${fmtInt(o.signups)} sign-ups (${fmtPct(o.sessionsBooked / o.signups)}).` })

  const maxDay = Math.max(1, ...o.daily.map((d) => d.visitors))
  return (
    <>
      <PageHead title="Overview" sub={`${range.label}. Visitors are counted per browser; learners once they sign up.`} range={range.key} base="/admin" />
      <div className="stat-grid">
        <Stat label="Visitors" value={fmtInt(o.visitors)} note={`${fmtInt(o.visits)} visits`} />
        <Stat label="Sign-ups (leads)" value={fmtInt(o.signups)} note={o.visitors && o.signups <= o.visitors ? `${fmtPct(o.signups / o.visitors)} of visitors` : undefined} />
        <Stat label="Active learners" value={fmtInt(o.activeUsers)} note="signed in and did something" />
        <Stat label="Tool reports generated" value={fmtInt(o.toolsReady)} />
        <Stat label="1:1 sessions booked" value={fmtInt(o.sessionsBooked)} />
        <Stat label="AI tokens used" value={fmtTokens(o.tokens.total)} note={`≈${fmtInr(o.tokens.costInr)} · ${fmtInt(o.tokens.calls)} AI calls`} />
        <Stat label="Resumes reviewed" value={fmtInt(o.resumes)} />
        <Stat label="Avg time on a page" value={fmtSecs(o.avgPageSeconds)} note={`${fmtInt(o.chatQuestions)} AI chat questions`} />
      </div>

      {insights.length > 0 && (
        <section className="card stack">
          <h2 className="card-title">What stands out</h2>
          <ul className="insights">{insights.map((i) => <li key={i.text} className={i.good ? 'good' : undefined}>{i.text}</li>)}</ul>
        </section>
      )}

      <section className="card stack">
        <div className="row between"><h2 className="card-title">Last 14 days: visitors per day</h2><span className="help-note">Sign-ups and tokens are shown when you hover over a day</span></div>
        <div className="spark">
          {o.daily.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.visitors} visitors, ${d.signups} sign-ups, ${fmtTokens(d.tokens)} tokens`}>
              <i className={d.signups ? 'on' : undefined} style={{ height: `${(d.visitors / maxDay) * 100}%` }} />
              <span>{d.day.slice(0, 2)}</span>
            </div>
          ))}
        </div>
        <p className="help-note">Darker bars are days with at least one sign-up.</p>
      </section>

      <div className="admin-grid-2">
        <section className="card stack">
          <div className="row between"><h2 className="card-title">Visitor journey</h2><Link className="small" href={`/admin/funnel?range=${range.key}`}>Details</Link></div>
          <Funnel steps={acq} />
        </section>
        <section className="card stack">
          <div className="row between"><h2 className="card-title">After sign-up</h2><Link className="small" href={`/admin/features?range=${range.key}`}>Used vs avoided</Link></div>
          <Funnel steps={act} />
        </section>
      </div>
    </>
  )
}
