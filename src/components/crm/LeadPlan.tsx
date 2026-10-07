import type { LeadPath } from '@/lib/lead-match'
import { pathKindLabel } from '@/lib/lead-match'
import type { RoadmapResult, SalaryResult, SkillGapResult } from '@/lib/tool-types'

type Test = { track: string; attempt: number; score: number | null; band: string | null; correct: number | null; total: number | null; completed_at: Date | null; breakdown: { byTopic?: { topic: string; total: number; correct: number }[]; seconds?: number; unanswered?: number } | null }

const BAND_LABEL: Record<string, string> = { ready: 'Ready', primer: 'Ready with a short primer', foundation: 'Needs the foundations first' }
const lpa = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(1)}L`

/** Their plan on one screen: map path, skill gap, roadmap, salary and eligibility test, each with a link to the full report. */
export function LeadPlan({ leadId, path, skillGap, roadmap, salary, test, attempts }: {
  leadId: string; path: LeadPath; skillGap: SkillGapResult | null; roadmap: RoadmapResult | null; salary: SalaryResult | null; test: Test | null; attempts: number
}) {
  const report = (tool: string) => `/api/crm/leads/${leadId}/report/${tool}`
  return (
    <section className="crm-panel" id="plan" aria-labelledby="plan-h">
      <div className="crm-panel-head"><h2 id="plan-h">Their plan and reports</h2><span className="crm-faint">The same results the learner sees</span></div>
      <div className="crm-plan-grid">
        <article className="crm-card">
          <span className="crm-label">Best-fit path · Learnbay course map</span>
          <b className="crm-card-title">{path.persona.name}</b>
          <span className="crm-faint">{path.match}% match · {path.persona.reasons.slice(0, 2).join(' · ')}</span>
          <ol className="crm-path">
            {path.options.map((o) => (
              <li key={o.programId} className={o.kind}>
                <span className="crm-path-kind">{pathKindLabel(o.kind)}</span>
                <span className="crm-path-name">{o.name}</span>
                <span className="crm-path-fit">{o.fit}/10{o.later ? ' · later' : ''}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="crm-card">
          <span className="crm-label">Eligibility test</span>
          {test ? (
            <>
              <div className="crm-stat-row"><b className="crm-big">{test.score ?? 0}<small>/100</small></b><span className={`crm-chip ${test.band ?? ''}`}>{BAND_LABEL[test.band ?? ''] ?? test.band}</span></div>
              <span className="crm-faint">{test.track.toUpperCase()} track · attempt {test.attempt}{attempts > 1 ? ` of ${attempts}` : ''} · {test.correct}/{test.total} correct{test.breakdown?.seconds ? ` in ${Math.round(test.breakdown.seconds / 60) || 1} min` : ''}{test.breakdown?.unanswered ? ` · ${test.breakdown.unanswered} unanswered` : ''}</span>
              {test.breakdown?.byTopic && (
                <ul className="crm-bars">
                  {test.breakdown.byTopic.map((t) => (
                    <li key={t.topic}><span>{t.topic}</span><div className="crm-meter small" aria-hidden="true"><i style={{ width: `${t.total ? (t.correct / t.total) * 100 : 0}%` }} /></div><b>{t.correct}/{t.total}</b></li>
                  ))}
                </ul>
              )}
            </>
          ) : <p className="crm-faint">{attempts ? 'Started but not finished.' : 'Not taken yet.'}</p>}
        </article>

        <article className="crm-card">
          <div className="crm-card-top"><span className="crm-label">Skill gap analysis</span>{skillGap && <a href={report('skill-gap')} target="_blank" rel="noreferrer" className="crm-link">Full report ↗</a>}</div>
          {skillGap ? (
            <>
              <div className="crm-stat-row"><b className="crm-big">{skillGap.readiness?.score ?? 0}<small>/100 ready</small></b><span className="crm-chip">{skillGap.targetRole}</span></div>
              <ul className="crm-bars">
                {(skillGap.gapDetails ?? []).slice(0, 4).map((g) => <li key={g.skill}><span>{g.skill}</span><b>~{g.weeks} wks</b></li>)}
              </ul>
            </>
          ) : <p className="crm-faint">Not built yet. Build it from Reports below.</p>}
        </article>

        <article className="crm-card">
          <div className="crm-card-top"><span className="crm-label">Career roadmap</span>{roadmap && <a href={report('roadmap')} target="_blank" rel="noreferrer" className="crm-link">Full report ↗</a>}</div>
          {roadmap ? (
            <>
              <div className="crm-stat-row"><b className="crm-big">{roadmap.durationMonths}<small> months</small></b><span className="crm-chip">{roadmap.targetRole}</span></div>
              <ol className="crm-steps">{roadmap.phases.slice(0, 4).map((p) => <li key={p.title}><b>{p.title}</b><span className="crm-faint">{p.weeks}</span></li>)}</ol>
            </>
          ) : <p className="crm-faint">Not built yet.</p>}
        </article>

        <article className="crm-card">
          <div className="crm-card-top"><span className="crm-label">Salary benchmark</span>{salary && <a href={report('salary')} target="_blank" rel="noreferrer" className="crm-link">Full report ↗</a>}</div>
          {salary ? (
            <>
              <span className="crm-faint">Their role today: {lpa(salary.currentRoleMarket.minLpa)}–{lpa(salary.currentRoleMarket.maxLpa)}</span>
              <ul className="crm-bars">{salary.targetRoles.slice(0, 3).map((t) => <li key={t.role}><span>{t.role}</span><b>{lpa(t.minLpa)}–{lpa(t.maxLpa)}</b></li>)}</ul>
              <span className="crm-faint">Indicative market ranges, not a promise.</span>
            </>
          ) : <p className="crm-faint">Not built yet.</p>}
        </article>
      </div>
    </section>
  )
}
