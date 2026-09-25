import { Icon } from '@/components/Icon'
import { formatLpa } from '@/components/report/Sections'
import { getReadyDashboard } from '@/lib/data'
import { currentCtcRange } from '@/lib/report'
import { experienceLabel } from '@/lib/questions'

export const metadata = { title: 'Salary Insights' }

export default async function SalaryPage() {
  const { report, answers } = await getReadyDashboard()
  const r = report.data
  const current = currentCtcRange(answers)
  const scaleMax = Math.ceil(Math.max(...r.salary.targetRoles.map((t) => t.maxLpa), current?.maxLpa ?? current?.minLpa ?? 0, 10) * 1.1)
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(scaleMax * f))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Salary Insights</h1>
          <p>Indicative India market ranges for {experienceLabel(answers).toLowerCase()} of experience, in lakhs per annum (LPA).</p>
        </div>
      </div>
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="card-title"><Icon name="rupee" className="text-primary" /> Where you are vs where you can be</h2>
          <span className="pill success">Potential growth +{r.potentialGrowth.minPercent}-{r.potentialGrowth.maxPercent}% (Indicative)</span>
        </div>
        <div className="salary-bars">
          {current && (
            <div className="salary-row">
              <div className="row"><b>Your current CTC</b><span className="small muted">{current.maxLpa ? `${formatLpa(current.minLpa)} – ${formatLpa(current.maxLpa)}` : `Above ${formatLpa(current.minLpa)}`}</span></div>
              <div className="salary-track"><i className="current" style={{ left: pct(current.minLpa), width: `calc(${pct(current.maxLpa ?? scaleMax)} - ${pct(current.minLpa)})` }} /></div>
            </div>
          )}
          {r.salary.targetRoles.map((t) => (
            <div className="salary-row" key={t.role}>
              <div className="row"><b>{t.role}</b><span className="small muted">{formatLpa(t.minLpa)} – {formatLpa(t.maxLpa)}</span></div>
              <div className="salary-track" role="img" aria-label={`${t.role}: ${t.minLpa} to ${t.maxLpa} LPA`}>
                <i style={{ left: pct(t.minLpa), width: `calc(${pct(t.maxLpa)} - ${pct(t.minLpa)})` }} />
              </div>
            </div>
          ))}
          <div className="salary-axis" aria-hidden="true">{ticks.map((t) => <span key={t}>₹{t}L</span>)}</div>
        </div>
        {r.potentialGrowth.note && <p className="small muted">{r.potentialGrowth.note}</p>}
      </section>
      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="trend" className="text-primary" /> What moves your salary up</h2>
          <ul className="list-check">{r.salary.drivers.map((d) => <li key={d}><Icon name="checkCircle" size="1.1rem" />{d}</li>)}</ul>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="alert" className="text-primary" /> About these numbers</h2>
          <p className="small muted">{r.salary.note || 'These are indicative market ranges estimated by AI, not offers or guarantees.'}</p>
          <p className="small muted">Your current CTC comes from your own answer. Target ranges are AI estimates for the Indian market and vary by company, city and interview performance.</p>
        </section>
      </div>
    </>
  )
}
