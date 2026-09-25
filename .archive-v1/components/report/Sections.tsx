import { Icon } from '../Icon'
import type { ReportData } from '@/lib/report-types'

/** Report building blocks shared by the dashboard, the print view and the shared link. */

export function RoadmapTimeline({ roadmap }: { roadmap: ReportData['roadmap'] }) {
  return (
    <div className="timeline">
      {roadmap.phases.map((p, i) => (
        <div className="phase" key={p.title + i}>
          <span className="phase-dot">{i + 1}</span>
          <h3>Phase {i + 1}: {p.title}</h3>
          <p className="weeks">{p.weeks}</p>
          <p className="focus">{p.focus}</p>
          <ul>{p.topics.map((t) => <li key={t}>{t}</li>)}</ul>
          {p.milestone && <p className="milestone"><b>Milestone:</b> {p.milestone}</p>}
        </div>
      ))}
    </div>
  )
}

export function SkillBars({ skills }: { skills: ReportData['skills'] }) {
  return (
    <div className="stack">
      <div className="legend">
        <span><i style={{ background: 'var(--primary)' }} />Your level</span>
        <span><i style={{ background: 'var(--ink-2)', width: '0.2rem' }} />Required level</span>
      </div>
      <div className="skill-table">
        {skills.map((s) => (
          <div className="skill-row" key={s.name}>
            <span className="skill-name">{s.name}</span>
            <span className="skill-level">Current: {s.currentLabel}</span>
            <div className="skill-bar" role="img" aria-label={`${s.name}: your level ${s.currentLevel} of 100, required ${s.requiredLevel}`}>
              <span className="cur" style={{ width: `${Math.max(2, s.currentLevel)}%` }} />
              <span className="req" style={{ left: `calc(${s.requiredLevel}% - 0.09rem)` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TopGaps({ gaps }: { gaps: string[] }) {
  return (
    <div className="gap-chips">
      {gaps.map((g, i) => <span className="gap-chip" key={g}><b>{i + 1}</b>{g}</span>)}
    </div>
  )
}

export function ProjectCards({ projects }: { projects: ReportData['projects'] }) {
  return (
    <div className="grid-3">
      {projects.map((p, i) => (
        <div className="card stack" key={p.title} style={{ gap: '0.625rem' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="pill primary">Project {i + 1}</span>
            <span className={`pill ${p.difficulty === 'Advanced' ? 'danger' : p.difficulty === 'Intermediate' ? 'warning' : 'success'}`}>{p.difficulty}</span>
          </div>
          <h3 style={{ fontSize: '1.0625rem' }}>{p.title}</h3>
          <p className="muted small">{p.description}</p>
          <div className="tag-list">{p.skills.map((s) => <span className="pill" key={s}>{s}</span>)}</div>
          <p className="small" style={{ display: 'flex', gap: '0.5rem' }}><Icon name="briefcase" size="1rem" className="text-primary" /> {p.portfolioValue}</p>
        </div>
      ))}
    </div>
  )
}

export function formatLpa(n: number): string {
  return `₹${Number.isInteger(n) ? n : n.toFixed(1)} LPA`
}
