// Lightweight SVG charts for the reports (no chart library). Server-renderable and responsive.
import { weekRange, type Kpi } from '@/lib/report-summary'

export function Gauge({ value, max = 100, size = 168, label }: { value: number; max?: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const r = 64, cx = 80, cy = 78
  const arc = (p: number) => {
    const a = Math.PI * (1 - p)
    return `${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)}`
  }
  const tone = pct >= 0.7 ? 'var(--success)' : pct >= 0.45 ? 'var(--primary)' : 'var(--accent)'
  return (
    <svg viewBox="0 0 160 96" width={size} height={size * 0.6} role="img" aria-label={`${value} out of ${max}${label ? `, ${label}` : ''}`} className="gauge">
      <path d={`M ${arc(0)} A ${r} ${r} 0 0 1 ${arc(1)}`} fill="none" stroke="var(--line-2)" strokeWidth="14" strokeLinecap="round" />
      {pct > 0 && <path d={`M ${arc(0)} A ${r} ${r} 0 0 1 ${arc(pct)}`} fill="none" stroke={tone} strokeWidth="14" strokeLinecap="round" />}
      <text x={cx} y={cy - 6} textAnchor="middle" className="gauge-num">{value}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="gauge-sub">out of {max}</text>
    </svg>
  )
}

export function KpiTiles({ items }: { items: Kpi[] }) {
  return (
    <div className="kpi-tiles">
      {items.map((k) => (
        <div key={k.label} className={`kpi ${k.tone ?? 'primary'}`}>
          <span className="kpi-label">{k.label}</span>
          <b className="kpi-value">{k.value}</b>
          {k.sub && <span className="kpi-sub">{k.sub}</span>}
        </div>
      ))}
    </div>
  )
}

/** Current vs required level per skill, biggest gaps first. */
export function SkillBars({ skills, limit }: { skills: { name: string; currentLevel: number; requiredLevel: number }[]; limit?: number }) {
  const sorted = [...skills].sort((a, b) => (b.requiredLevel - b.currentLevel) - (a.requiredLevel - a.currentLevel))
  const list = limit ? sorted.slice(0, limit) : sorted
  return (
    <div className="skillbars">
      {list.map((s) => {
        const gap = s.requiredLevel - s.currentLevel
        return (
          <div className="skillbar" key={s.name}>
            <div className="skillbar-top">
              <span>{s.name}</span>
              {gap > 0 ? <b className="gap-tag">+{gap} to go</b> : <b className="ok-tag">Ready</b>}
            </div>
            <div className="skillbar-track" role="img" aria-label={`${s.name}: you ${s.currentLevel}, needed ${s.requiredLevel} out of 100`}>
              <i className="need" style={{ width: `${s.requiredLevel}%` }} />
              <i className="have" style={{ width: `${Math.max(2, s.currentLevel)}%` }} />
            </div>
          </div>
        )
      })}
      <div className="chart-legend"><span><i className="have" />You today</span><span><i className="need" />Needed for the role</span></div>
    </div>
  )
}

/** Horizontal min–max ranges on one scale (salary bands). */
export function RangeChart({ rows }: { rows: { label: string; sub?: string; min: number; max: number; tone?: 'current' | 'target' | 'muted' }[] }) {
  const top = Math.ceil(Math.max(10, ...rows.map((r) => r.max)) * 1.1)
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f))
  return (
    <div className="rangechart">
      {rows.map((r) => (
        <div className="range-row" key={r.label + (r.sub ?? '')}>
          <div className="range-label"><b>{r.label}</b>{r.sub && <span>{r.sub}</span>}</div>
          <div className="range-track" role="img" aria-label={`${r.label}: ${r.min} to ${r.max} lakh per year`}>
            <i className={r.tone ?? 'target'} style={{ left: pct(r.min), width: `calc(${pct(r.max)} - ${pct(r.min)})` }}>
              <span>₹{r.min}–{r.max}L</span>
            </i>
          </div>
        </div>
      ))}
      <div className="range-axis" aria-hidden="true">{ticks.map((t) => <span key={t}>₹{t}L</span>)}</div>
    </div>
  )
}

/** Rising columns for a career ladder (pay by seniority). */
export function LadderChart({ steps }: { steps: { stage: string; years: string; minLpa: number; maxLpa: number }[] }) {
  const top = Math.max(1, ...steps.map((s) => s.maxLpa))
  return (
    <div className="ladder-chart" role="img" aria-label="Pay by seniority">
      {steps.map((s, i) => (
        <div className="ladder-col" key={s.stage}>
          <b>₹{s.minLpa}–{s.maxLpa}L</b>
          <div className="ladder-bar"><i style={{ height: `${Math.max(8, (s.maxLpa / top) * 100)}%`, opacity: 0.55 + (i / steps.length) * 0.45 }} /></div>
          <span className="ladder-stage">{s.stage}</span>
          <span className="ladder-years">{s.years}</span>
        </div>
      ))}
    </div>
  )
}

/** Gantt-style roadmap: one bar per phase across the plan's weeks. */
export function PhaseTimeline({ phases, months }: { phases: { title: string; weeks: string; milestone: string }[]; months: number }) {
  const totalWeeks = Math.max(4, Math.round(months * 4.3))
  const per = totalWeeks / Math.max(1, phases.length)
  const bars = phases.map((p, i) => {
    const [a, b] = weekRange(p.weeks, [Math.round(i * per) + 1, Math.round((i + 1) * per)])
    return { ...p, a: Math.min(a, totalWeeks), b: Math.min(Math.max(b, a), totalWeeks) }
  })
  const monthMarks = Array.from({ length: months + 1 }, (_, m) => m)
  return (
    <div className="phase-timeline">
      <div className="pt-axis" aria-hidden="true">
        {monthMarks.filter((m) => m % Math.ceil(months / 6 || 1) === 0).map((m) => (
          // The first and last marks align to the edge instead of hanging half outside it.
          <span key={m} className={m === 0 ? 'first' : m === months ? 'last' : ''} style={{ left: `${(m / months) * 100}%` }}>M{m}</span>
        ))}
      </div>
      {bars.map((p, i) => {
        const left = ((p.a - 1) / totalWeeks) * 100
        const width = Math.max(4, ((p.b - p.a + 1) / totalWeeks) * 100)
        const label = p.weeks.replace(/^weeks?\s*/i, 'Wk ')
        // Short bars can't hold their label: it sits just after the bar (or before it, near the end of the track).
        const inside = width >= 26
        const after = !inside && left + width <= 74
        return (
          <div className="pt-row" key={p.title + i}>
            <span className="pt-label"><b>{i + 1}</b>{p.title}</span>
            <div className="pt-track">
              <i className={`c${i % 4}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${p.weeks}: ${p.milestone}`}>
                {inside && <span>{label}</span>}
              </i>
              {!inside && (
                <span className={`pt-out ${after ? 'after' : 'before'}`} style={after ? { left: `calc(${left + width}% + 6px)` } : { right: `calc(${100 - left}% + 6px)` }}>{label}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Small ring for a share of a whole (e.g. gaps a program covers). */
export function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const r = 26, c = 2 * Math.PI * r
  const p = total ? Math.min(1, value / total) : 0
  return (
    <div className="ring">
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line-2)" strokeWidth="8" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--primary)" strokeWidth="8" strokeDasharray={`${c * p} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
        <text x="32" y="36" textAnchor="middle" className="ring-num">{value}/{total}</text>
      </svg>
      <span>{label}</span>
    </div>
  )
}
