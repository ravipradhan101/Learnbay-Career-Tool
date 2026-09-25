import { Icon } from '../Icon'
import { ActionPlan } from '../report/ActionPlan'
import { LadderChart, PhaseTimeline, RangeChart, Ring, SkillBars } from '../report/Charts'
import { ChartCard, EligibilityStrip, LearnbayEdge, More, ReportHero } from '../report/ReportParts'
import { PublishedStory } from '../usp/UspNote'
import { getProgram } from '@/config/programs'
import { getResources } from '@/config/resources'
import { roadmapSummary, salarySummary, skillGapSummary } from '@/lib/report-summary'
import type { ProgramFit, RoadmapResult, SalaryResult, SkillGapResult } from '@/lib/tool-types'

// Report layout, built for skimming: one headline number, key numbers, 3 actions, charts,
// then details folded away. Learnbay appears once, as a compact "recommended for you" strip.

export const formatLpa = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(1)} LPA`

/** Learner context for the personal parts of a report (not shown on public share links). */
export type ReportExtras = { area: string; role: string; eligibilityDone: boolean }

export function ProgramFitCard({ fit, showLink = true }: { fit: ProgramFit; showLink?: boolean }) {
  const program = getProgram(fit.programId)
  return (
    <section className="program-fit">
      <div className="row between">
        <span className="eyebrow">Best-fit Learnbay program</span>
        <span className="pill solid">Best Fit</span>
      </div>
      <h3>{program.name}</h3>
      <ul className="list-check">{fit.whyProgram.map((w) => <li key={w}><Icon name="checkCircle" size="1.1rem" />{w}</li>)}</ul>
      <div className="tag-list">{program.features.map((f) => <span key={f} className="pill primary">{f}</span>)}</div>
      {showLink && (
        <a href={program.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
          View program details <Icon name="external" size="0.9rem" />
        </a>
      )}
    </section>
  )
}

const Bullets = ({ items, icon = 'checkCircle', warn }: { items: string[]; icon?: 'checkCircle' | 'alert'; warn?: boolean }) => (
  <ul className={`list-check${warn ? ' warn' : ''}`}>{items.map((t, i) => <li key={i}><Icon name={icon} size="1.05rem" />{t}</li>)}</ul>
)

// ---------------- Skill Gap ----------------

export function SkillGapView({ r, shared = false, extras }: { r: SkillGapResult; shared?: boolean; extras?: ReportExtras }) {
  const s = skillGapSummary(r)
  const { totalGaps, programCovers, genericCovers } = r.coverage
  return (
    <>
      <ReportHero summary={s} gauge={r.readiness.score} />
      {!shared && <ActionPlan tool="skill-gap" actions={s.actions} />}

      <div className="grid-2 report-grid">
        <ChartCard title="Where you stand" sub="Your level vs what the role needs. Biggest gaps first.">
          <SkillBars skills={r.skills} limit={6} />
        </ChartCard>
        <div className="stack">
          {r.gapDetails && r.gapDetails.length > 0 && (
            <ChartCard title="Time to close each gap" sub="Weeks at your weekly pace">
              <div className="weekbars">
                {r.gapDetails.map((g) => {
                  const max = Math.max(...r.gapDetails!.map((x) => x.weeks))
                  return (
                    <div className="weekbar" key={g.skill}>
                      <span>{g.skill}</span>
                      <div><i style={{ width: `${(g.weeks / max) * 100}%` }} /></div>
                      <b>{g.weeks}w</b>
                    </div>
                  )
                })}
              </div>
            </ChartCard>
          )}
          <ChartCard title="Your strengths" sub="What already transfers to the new role">
            <div className="tag-list">{r.strengths.map((t) => <span key={t} className="pill success">{t}</span>)}</div>
          </ChartCard>
        </div>
      </div>

      <div className="more-group">
        {r.gapDetails && r.gapDetails.length > 0 && (
          <More title="How to close each gap" count={r.gapDetails.length} open={!shared}>
            <div className="gap-cards">
              {r.gapDetails.map((g, i) => (
                <div key={g.skill} className="gap-card">
                  <span className="gap-chip"><b>{i + 1}</b>{g.skill}</span>
                  <p><b>Why:</b> {g.whyItMatters}</p>
                  <p><b>How:</b> {g.howToClose}</p>
                </div>
              ))}
            </div>
          </More>
        )}
        <More title="All skills, skill by skill" count={r.skills.length}><SkillBars skills={r.skills} /></More>
        {(r.interviewTopics?.length ?? 0) > 0 && (
          <More title="What interviewers will test" count={r.interviewTopics!.length}>
            <div className="tag-list">{r.interviewTopics!.map((t) => <span key={t} className="pill primary">{t}</span>)}</div>
            {r.marketDemand?.summary && <p className="small">{r.marketDemand.summary}</p>}
            {r.marketDemand?.signals?.length ? <Bullets items={r.marketDemand.signals} /> : null}
          </More>
        )}
        {(r.proofProjects?.length ?? 0) > 0 && (
          <More title="Projects that prove you've closed the gaps" count={r.proofProjects!.length}>
            <Bullets items={r.proofProjects!.map((p) => `${p.title}: ${p.proves}`)} />
          </More>
        )}
        {(r.thirtyDayPlan?.length ?? 0) > 0 && (
          <More title="Your first 30 days" count={r.thirtyDayPlan!.length}>
            <ol className="week-plan">{r.thirtyDayPlan!.map((w) => <li key={w.week}><b>{w.week}</b><span>{w.focus}</span></li>)}</ol>
          </More>
        )}
        {(r.watchOuts?.length ?? 0) > 0 && <More title="Common mistakes to avoid" count={r.watchOuts!.length}><Bullets items={r.watchOuts!} icon="alert" warn /></More>}
      </div>

      {!shared && extras && (
        <>
          <div className="coverage-compare">
            <Ring value={programCovers} total={totalGaps} label="gaps covered by your recommended program" />
            <Ring value={genericCovers} total={totalGaps} label="covered by a typical generic course" />
          </div>
          <LearnbayEdge ids={['customisation', 'projects', 'mentors']} programId={r.programId} coverage={{ covers: programCovers, total: totalGaps }} />
          {!extras.eligibilityDone && <EligibilityStrip area={extras.area} />}
          <PublishedStory />
        </>
      )}
    </>
  )
}

// ---------------- Salary ----------------

export function SalaryView({ r, current, shared = false, extras }: { r: SalaryResult; current: { minLpa: number; maxLpa: number | null } | null; shared?: boolean; extras?: ReportExtras }) {
  const cur = shared ? null : current
  const s = salarySummary(r, cur)
  const rows = [
    ...(cur ? [{ label: 'You today', min: cur.minLpa, max: cur.maxLpa ?? cur.minLpa * 1.2, tone: 'current' as const }] : []),
    { label: 'Your role, market', min: r.currentRoleMarket.minLpa, max: r.currentRoleMarket.maxLpa, tone: 'muted' as const },
    ...r.targetRoles.map((t) => ({ label: t.role, min: t.minLpa, max: t.maxLpa, tone: 'target' as const })),
  ]
  return (
    <>
      <ReportHero summary={s} />
      {!shared && <ActionPlan tool="salary" actions={s.actions} />}

      <ChartCard title="What you could earn" sub="Indicative market ranges in ₹ lakh per year for your experience and city">
        <RangeChart rows={rows} />
      </ChartCard>

      <div className="grid-2 report-grid">
        {(r.careerLadder?.length ?? 0) > 0 && (
          <ChartCard title="How pay grows in the role" sub={r.targetRole}>
            <LadderChart steps={r.careerLadder!} />
          </ChartCard>
        )}
        {(r.companyTypes?.length ?? 0) > 0 && (
          <ChartCard title="Who pays most" sub="By type of employer">
            <RangeChart rows={r.companyTypes!.map((c) => ({ label: c.type, min: c.minLpa, max: c.maxLpa, tone: 'target' as const }))} />
          </ChartCard>
        )}
      </div>

      <div className="more-group">
        {(r.skillPremiums?.length ?? 0) > 0 && (
          <More title="Skills that raise your pay" count={r.skillPremiums!.length} open={!shared}>
            <ul className="premium-list">
              {r.skillPremiums!.map((k) => <li key={k.skill}><span className={`pill ${k.impact === 'High' ? 'success' : 'warning'}`}>{k.impact}</span><span><b>{k.skill}</b><span className="small muted">{k.note}</span></span></li>)}
            </ul>
          </More>
        )}
        {(r.cityComparison?.length ?? 0) > 0 && (
          <More title="Pay by city" count={r.cityComparison!.length}>
            <RangeChart rows={r.cityComparison!.map((c) => ({ label: c.city, min: c.minLpa, max: c.maxLpa, tone: 'target' as const }))} />
          </More>
        )}
        {(r.negotiationTips?.length ?? 0) > 0 && <More title="Negotiating your offer" count={r.negotiationTips!.length}><Bullets items={r.negotiationTips!} /></More>}
        <More title="What moves your salary up" count={r.drivers.length}><Bullets items={r.drivers} /></More>
      </div>
      <p className="xsmall muted">{r.note || 'Indicative AI-estimated market ranges, not offers or guarantees.'}</p>

      {!shared && extras && (
        <>
          <LearnbayEdge ids={['placement', 'domain', 'projects']} programId={r.programId} />
          {!extras.eligibilityDone && <EligibilityStrip area={extras.area} />}
        </>
      )}
    </>
  )
}

// ---------------- Roadmap ----------------

export function RoadmapView({ r, shared = false, extras }: { r: RoadmapResult; shared?: boolean; extras?: ReportExtras }) {
  const s = roadmapSummary(r)
  const resources = getResources(r.resourceIds)
  return (
    <>
      <ReportHero summary={s} />
      {!shared && <ActionPlan tool="roadmap" actions={s.actions} />}

      <ChartCard title={`Your ${r.durationMonths}-month plan at a glance`} sub={`${r.weeklyHours} · each phase ends with a milestone you can show`}>
        <PhaseTimeline phases={r.phases} months={r.durationMonths} />
        {(r.monthlyCheckpoints?.length ?? 0) > 0 && (
          <div className="checkpoint-dots">
            {r.monthlyCheckpoints!.map((m) => <span key={m.month} title={m.goal}><b>M{m.month}</b>{m.goal}</span>)}
          </div>
        )}
      </ChartCard>

      <div className="more-group">
        {r.phases.map((p, i) => (
          <More key={p.title + i} title={`Phase ${i + 1}: ${p.title}`} open={!shared && i === 0}>
            <p className="small muted">{p.weeks} · {p.focus}</p>
            <div className="tag-list">{p.topics.map((t) => <span key={t} className="pill">{t}</span>)}</div>
            {p.milestone && <p className="small"><b>Milestone:</b> {p.milestone}</p>}
            {(p.deliverables?.length ?? 0) > 0 && <Bullets items={p.deliverables!} />}
            {p.practice && <p className="small muted"><b>Practice:</b> {p.practice}</p>}
          </More>
        ))}
        <More title="Portfolio projects" count={r.projects.length}>
          <div className="gap-cards">
            {r.projects.map((p) => (
              <div key={p.title} className="gap-card">
                <div className="row between"><b>{p.title}</b><span className={`pill ${p.difficulty === 'Advanced' ? 'danger' : p.difficulty === 'Intermediate' ? 'warning' : 'success'}`}>{p.difficulty}</span></div>
                <p>{p.description}</p>
                <div className="tag-list">{p.skills.map((k) => <span className="pill" key={k}>{k}</span>)}</div>
              </div>
            ))}
          </div>
        </More>
        {(r.risks?.length ?? 0) > 0 && (
          <More title="Where plans stall, and what to do" count={r.risks!.length}>
            <ul className="risk-list">{r.risks!.map((k) => <li key={k.risk}><b>{k.risk}</b><span>{k.mitigation}</span></li>)}</ul>
          </More>
        )}
        {(r.interviewPrep?.length ?? 0) > 0 && <More title="Getting interview-ready" count={r.interviewPrep!.length}><Bullets items={r.interviewPrep!} /></More>}
        {(r.portfolioTips?.length ?? 0) > 0 && <More title="Making your portfolio stand out" count={r.portfolioTips!.length}><Bullets items={r.portfolioTips!} /></More>}
        {!shared && resources.length > 0 && (
          <More title="Free resources to start with" count={resources.length}>
            <div className="resource-list">
              {resources.map((res) => (
                <a key={res.id} className="resource" href={res.url} target="_blank" rel="noopener noreferrer">
                  <span className="fc-icon"><Icon name={res.type === 'Course' ? 'award' : 'book'} /></span>
                  <span style={{ flex: 1 }}><b>{res.title}</b><span>{res.provider} • {res.type}</span></span>
                  <Icon name="external" size="1rem" className="muted" />
                </a>
              ))}
            </div>
          </More>
        )}
        <div className="tag-list">{r.tools.map((t) => <span key={t} className="pill">{t}</span>)}</div>
      </div>

      {!shared && extras && (
        <>
          <LearnbayEdge ids={['mentors', 'hybrid', 'placement']} programId={r.programId} />
          {!extras.eligibilityDone && <EligibilityStrip area={extras.area} />}
          <PublishedStory />
        </>
      )}
    </>
  )
}
