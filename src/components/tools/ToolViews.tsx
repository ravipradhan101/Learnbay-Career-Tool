import { Icon } from '../Icon'
import { EligibilityNudge, PublishedStory, UspNote } from '../usp/UspNote'
import { getProgram } from '@/config/programs'
import { getResources } from '@/config/resources'
import type { ProgramFit, RoadmapResult, SalaryResult, SkillGapResult } from '@/lib/tool-types'

export const formatLpa = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(1)} LPA`
const an = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')

/** Learner context for the helpful Learnbay notes between sections (not shown on public share links). */
export type ReportExtras = { area: string; role: string; eligibilityDone: boolean }

/** A horizontal range bar on a shared scale. */
function RangeRow({ label, sub, min, max, scale, highlight }: { label: string; sub?: string; min: number; max: number; scale: number; highlight?: boolean }) {
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`
  return (
    <div className="salary-row">
      <div className="row between"><span><b>{label}</b>{sub && <span className="small muted"> · {sub}</span>}</span><span className="small muted">{formatLpa(min)} – {formatLpa(max)}</span></div>
      <div className="salary-track" role="img" aria-label={`${label}: ${min} to ${max} LPA`}><i className={highlight ? 'current' : undefined} style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} /></div>
    </div>
  )
}

export function ProgramFitCard({ fit, showLink = true }: { fit: ProgramFit; showLink?: boolean }) {
  const program = getProgram(fit.programId)
  return (
    <section className="program-fit">
      <div className="row between">
        <span className="eyebrow">Best-fit Learnbay program</span>
        <span className="pill solid">Best Fit</span>
      </div>
      <h3>{program.name}</h3>
      <p className="small muted">{program.summary}</p>
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

export function SkillGapView({ r, shared = false, extras }: { r: SkillGapResult; shared?: boolean; extras?: ReportExtras }) {
  const { totalGaps, programCovers, genericCovers, genericMisses } = r.coverage
  const program = getProgram(r.programId)
  return (
    <>
      <section className="card stack">
        <div className="score-row">
          <div className="score-ring" style={{ ['--v' as string]: r.readiness.score }}><div><b>{r.readiness.score}</b><small>/100</small></div></div>
          <div className="stack" style={{ gap: '0.375rem', flex: 1, minWidth: '14rem' }}>
            <span className="row" style={{ gap: '0.5rem' }}><span className="pill primary">{r.readiness.band}</span><span className="small muted">Readiness for {an(r.targetRole)} {r.targetRole} role</span></span>
            <p>{r.summary}</p>
          </div>
        </div>
      </section>
      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="checkCircle" className="text-success" /> Current strengths</h2>
          <ul className="list-check">{r.strengths.map((s) => <li key={s}><Icon name="check" size="1.1rem" />{s}</li>)}</ul>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="target" className="text-primary" /> Priority skill gaps</h2>
          <div className="gap-chips">{r.topGaps.map((g, i) => <span className="gap-chip" key={g}><b>{i + 1}</b>{g}</span>)}</div>
          {r.nextStep && <p className="small"><b>Your focused next step:</b> {r.nextStep}</p>}
        </section>
      </div>
      <section className="card stack">
        <h2 className="card-title">Where you stand, skill by skill</h2>
        <div className="legend"><span><i style={{ background: 'var(--primary)' }} />Your level</span><span><i style={{ background: 'var(--accent)', width: '0.2rem' }} />Needed for {r.targetRole}</span></div>
        <div className="skill-table">
          {r.skills.map((s) => (
            <div className="skill-row" key={s.name}>
              <span className="skill-name">{s.name}</span>
              <span className="skill-level">Current: {s.currentLabel}</span>
              <div className="skill-bar" role="img" aria-label={`${s.name}: ${s.currentLevel} of 100, needed ${s.requiredLevel}`}>
                <span className="cur" style={{ width: `${Math.max(2, s.currentLevel)}%` }} />
                <span className="req" style={{ left: `calc(${s.requiredLevel}% - 0.09rem)` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="tag-list">{r.tools.map((t) => <span key={t} className="pill">{t}</span>)}</div>
      </section>

      {r.gapDetails && r.gapDetails.length > 0 && (
        <section className="stack">
          <h2 className="card-title"><Icon name="flame" className="text-primary" /> How to close your top gaps</h2>
          <div className="grid-2">
            {r.gapDetails.map((g, i) => (
              <div className="card stack gap-detail" key={g.skill}>
                <div className="row between"><span className="gap-chip"><b>{i + 1}</b>{g.skill}</span><span className="pill"><Icon name="clock" size="0.85rem" /> ~{g.weeks} week{g.weeks === 1 ? '' : 's'}</span></div>
                <p className="small"><b>Why it matters:</b> {g.whyItMatters}</p>
                <p className="small"><b>How to close it:</b> {g.howToClose}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {extras && <UspNote usp="customisation" lead={`Your gaps are specific to moving from ${extras.role} into ${extras.area}. Closing them should not mean starting from zero.`} />}

      {(r.marketDemand?.summary || (r.interviewTopics?.length ?? 0) > 0) && (
        <div className="grid-2">
          {r.marketDemand?.summary && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="briefcase" className="text-primary" /> What employers look for</h2>
              <p className="small">{r.marketDemand.summary}</p>
              <ul className="list-check">{r.marketDemand.signals.map((s) => <li key={s}><Icon name="checkCircle" size="1.1rem" />{s}</li>)}</ul>
            </section>
          )}
          {(r.interviewTopics?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="message" className="text-primary" /> Topics interviewers test</h2>
              <p className="small muted">Prepare these for {an(r.targetRole)} {r.targetRole} interview.</p>
              <div className="tag-list">{r.interviewTopics!.map((t) => <span key={t} className="pill primary">{t}</span>)}</div>
            </section>
          )}
        </div>
      )}

      {(r.proofProjects?.length ?? 0) > 0 && (
        <section className="stack">
          <h2 className="card-title"><Icon name="folder" className="text-primary" /> Projects that prove you have closed the gaps</h2>
          <div className="grid-3">
            {r.proofProjects!.map((p, i) => (
              <div className="card stack" key={p.title} style={{ gap: '0.5rem' }}>
                <span className="pill primary" style={{ alignSelf: 'flex-start' }}>Project {i + 1}</span>
                <h3 style={{ fontSize: '1rem' }}>{p.title}</h3>
                <p className="small muted">{p.proves}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {extras && <UspNote usp="projects" lead="Projects are what convince a recruiter that a gap is really closed." />}

      {((r.thirtyDayPlan?.length ?? 0) > 0 || (r.watchOuts?.length ?? 0) > 0) && (
        <div className="grid-2">
          {(r.thirtyDayPlan?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="calendar" className="text-primary" /> Your first 30 days</h2>
              <ol className="week-plan">{r.thirtyDayPlan!.map((w) => <li key={w.week}><b>{w.week}</b><span>{w.focus}</span></li>)}</ol>
            </section>
          )}
          {(r.watchOuts?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="alert" className="text-primary" /> Watch out for</h2>
              <ul className="list-check warn">{r.watchOuts!.map((w) => <li key={w}><Icon name="alert" size="1.05rem" />{w}</li>)}</ul>
            </section>
          )}
        </div>
      )}

      {!shared && (
        <div className="grid-2">
          <section className="card stack">
            <h2 className="card-title">Specialised vs generic: your {totalGaps} gaps</h2>
            <div className="coverage">
              <div className="coverage-row"><b>{program.name}</b><b>{programCovers}/{totalGaps}</b><div className="coverage-bar"><i style={{ width: `${(programCovers / totalGaps) * 100}%` }} /></div></div>
              <div className="coverage-row"><span>A generic online course</span><b className="muted">{genericCovers}/{totalGaps}</b><div className="coverage-bar"><i className="generic" style={{ width: `${(genericCovers / totalGaps) * 100}%` }} /></div></div>
            </div>
            {genericMisses.length > 0 && <p className="small muted">What generic courses usually leave out for you: <b style={{ color: 'var(--ink-2)' }}>{genericMisses.join(', ')}</b>.</p>}
            <p className="xsmall muted">AI estimate from your gaps and each program&apos;s published focus areas.</p>
          </section>
          <ProgramFitCard fit={r} />
        </div>
      )}
      {extras && <EligibilityNudge area={extras.area} done={extras.eligibilityDone} />}
      {extras && <PublishedStory />}
    </>
  )
}

export function SalaryView({ r, current, shared = false, extras }: { r: SalaryResult; current: { minLpa: number; maxLpa: number | null } | null; shared?: boolean; extras?: ReportExtras }) {
  const cur = shared ? null : current
  const max = Math.ceil(Math.max(...r.targetRoles.map((t) => t.maxLpa), r.currentRoleMarket.maxLpa, cur?.maxLpa ?? cur?.minLpa ?? 0, 10) * 1.1)
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`
  const bar = (min: number, hi: number, cls = '') => <i className={cls} style={{ left: pct(min), width: `calc(${pct(hi)} - ${pct(min)})` }} />
  return (
    <>
      <div className="grid-2">
        <section className="card stack">
          <span className="eyebrow">Potential growth (indicative)</span>
          <p className="growth-num">+{r.growth.minPercent}–{r.growth.maxPercent}%</p>
          <p className="small muted">{r.growth.note}</p>
        </section>
        <section className="card stack">
          <span className="eyebrow">Your position</span>
          <p>{r.summary}</p>
        </section>
      </div>
      <section className="card stack">
        <h2 className="card-title"><Icon name="rupee" className="text-primary" /> Market benchmark (₹ LPA)</h2>
        <div className="salary-bars">
          {cur && (
            <div className="salary-row">
              <div className="row between"><b>Your current CTC</b><span className="small muted">{cur.maxLpa ? `${formatLpa(cur.minLpa)} – ${formatLpa(cur.maxLpa)}` : `Above ${formatLpa(cur.minLpa)}`}</span></div>
              <div className="salary-track">{bar(cur.minLpa, cur.maxLpa ?? max, 'current')}</div>
            </div>
          )}
          <div className="salary-row">
            <div className="row between"><b>Market for your current role</b><span className="small muted">{formatLpa(r.currentRoleMarket.minLpa)} – {formatLpa(r.currentRoleMarket.maxLpa)}</span></div>
            <div className="salary-track">{bar(r.currentRoleMarket.minLpa, r.currentRoleMarket.maxLpa, 'current')}</div>
          </div>
          {r.targetRoles.map((t) => (
            <div className="salary-row" key={t.role}>
              <div className="row between"><b>{t.role}</b><span className="small muted">{formatLpa(t.minLpa)} – {formatLpa(t.maxLpa)}</span></div>
              <div className="salary-track" role="img" aria-label={`${t.role}: ${t.minLpa} to ${t.maxLpa} LPA`}>{bar(t.minLpa, t.maxLpa)}</div>
            </div>
          ))}
          <div className="salary-axis" aria-hidden="true">{[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f}>₹{Math.round(max * f)}L</span>)}</div>
        </div>
        <p className="xsmall muted">{r.note || 'Indicative AI-estimated market ranges, not offers or guarantees.'}</p>
      </section>

      {(r.companyTypes?.length ?? 0) > 0 && (() => {
        const scale = Math.ceil(Math.max(...r.companyTypes!.map((c) => c.maxLpa), 10) * 1.1)
        return (
          <section className="card stack">
            <h2 className="card-title"><Icon name="briefcase" className="text-primary" /> {r.targetRole}: pay by type of employer</h2>
            <div className="salary-bars">{r.companyTypes!.map((c) => <RangeRow key={c.type} label={c.type} sub={c.note} min={c.minLpa} max={c.maxLpa} scale={scale} />)}</div>
          </section>
        )
      })()}

      {extras && <UspNote usp="placement" lead="The biggest salary jump usually happens at the offer stage, so preparation matters as much as skills." />}

      {((r.cityComparison?.length ?? 0) > 0 || (r.careerLadder?.length ?? 0) > 0) && (
        <div className="grid-2">
          {(r.cityComparison?.length ?? 0) > 0 && (() => {
            const scale = Math.ceil(Math.max(...r.cityComparison!.map((c) => c.maxLpa), 10) * 1.1)
            return (
              <section className="card stack">
                <h2 className="card-title"><Icon name="grid" className="text-primary" /> By city</h2>
                <div className="salary-bars">{r.cityComparison!.map((c) => <RangeRow key={c.city} label={c.city} min={c.minLpa} max={c.maxLpa} scale={scale} />)}</div>
              </section>
            )
          })()}
          {(r.careerLadder?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="trend" className="text-primary" /> How pay grows in this role</h2>
              <ol className="ladder">
                {r.careerLadder!.map((l) => (
                  <li key={l.stage}><span><b>{l.stage}</b><span className="small muted">{l.years}</span></span><b className="text-primary">{formatLpa(l.minLpa)} – {formatLpa(l.maxLpa)}</b></li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {((r.skillPremiums?.length ?? 0) > 0 || (r.negotiationTips?.length ?? 0) > 0) && (
        <div className="grid-2">
          {(r.skillPremiums?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="sparkles" className="text-primary" /> Skills that add the most</h2>
              <ul className="premium-list">
                {r.skillPremiums!.map((k) => <li key={k.skill}><span className={`pill ${k.impact === 'High' ? 'success' : 'warning'}`}>{k.impact} impact</span><span><b>{k.skill}</b><span className="small muted">{k.note}</span></span></li>)}
              </ul>
            </section>
          )}
          {(r.negotiationTips?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="users" className="text-primary" /> Negotiating your offer</h2>
              <ol className="list-num">{r.negotiationTips!.map((t) => <li key={t}>{t}</li>)}</ol>
            </section>
          )}
        </div>
      )}

      {extras && <UspNote usp="domain" lead="Industry knowledge is hard to replace. Specialising lets you carry it into the new role instead of starting over." />}

      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="trend" className="text-primary" /> What moves your salary up</h2>
          <ul className="list-check">{r.drivers.map((d) => <li key={d}><Icon name="checkCircle" size="1.1rem" />{d}</li>)}</ul>
        </section>
        {!shared && <ProgramFitCard fit={r} />}
      </div>
      {extras && <EligibilityNudge area={extras.area} done={extras.eligibilityDone} />}
    </>
  )
}

export function RoadmapView({ r, shared = false, extras }: { r: RoadmapResult; shared?: boolean; extras?: ReportExtras }) {
  const resources = getResources(r.resourceIds)
  return (
    <>
      <section className="card stack">
        <div className="row between">
          <h2 className="card-title">Your {r.durationMonths}-month roadmap to {r.targetRole}</h2>
          <span className="pill primary">{r.weeklyHours}</span>
        </div>
        <p className="muted">{r.summary}</p>
        <div className="timeline">
          {r.phases.map((p, i) => (
            <div className="phase" key={p.title + i}>
              <span className="phase-dot">{i + 1}</span>
              <h3>{p.title}</h3>
              <p className="weeks">{p.weeks}</p>
              <p className="focus">{p.focus}</p>
              <ul>{p.topics.map((t) => <li key={t}>{t}</li>)}</ul>
              {p.milestone && <p className="milestone"><b>Milestone:</b> {p.milestone}</p>}
              {(p.deliverables?.length ?? 0) > 0 && <p className="small"><b>You will have:</b> {p.deliverables!.join(' · ')}</p>}
              {p.practice && <p className="small muted"><b>Practice:</b> {p.practice}</p>}
            </div>
          ))}
        </div>
      </section>

      {(r.monthlyCheckpoints?.length ?? 0) > 0 && (
        <section className="card stack">
          <h2 className="card-title"><Icon name="calendar" className="text-primary" /> Monthly checkpoints</h2>
          <p className="small muted">Check yourself against these. If you are behind, adjust the plan rather than abandoning it.</p>
          <ol className="checkpoints">{r.monthlyCheckpoints!.map((m) => <li key={m.month}><span>M{m.month}</span><p>{m.goal}</p></li>)}</ol>
        </section>
      )}

      {extras && <UspNote usp="mentors" lead="Plans like this are much easier to keep when someone is checking in with you." />}
      <section className="stack">
        <h2 className="card-title"><Icon name="folder" className="text-primary" /> Portfolio projects</h2>
        <div className="grid-3">
          {r.projects.map((p, i) => (
            <div className="card stack" key={p.title} style={{ gap: '0.5rem' }}>
              <div className="row between"><span className="pill primary">Project {i + 1}</span><span className={`pill ${p.difficulty === 'Advanced' ? 'danger' : p.difficulty === 'Intermediate' ? 'warning' : 'success'}`}>{p.difficulty}</span></div>
              <h3 style={{ fontSize: '1rem' }}>{p.title}</h3>
              <p className="small muted">{p.description}</p>
              <div className="tag-list">{p.skills.map((s) => <span className="pill" key={s}>{s}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
      {extras && <UspNote usp="hybrid" lead="Your plan has to fit around your job." />}

      {((r.risks?.length ?? 0) > 0 || (r.portfolioTips?.length ?? 0) > 0) && (
        <div className="grid-2">
          {(r.risks?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="shield" className="text-primary" /> Where plans stall, and what to do</h2>
              <ul className="risk-list">{r.risks!.map((k) => <li key={k.risk}><b>{k.risk}</b><span>{k.mitigation}</span></li>)}</ul>
            </section>
          )}
          {(r.portfolioTips?.length ?? 0) > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="folder" className="text-primary" /> Making your portfolio stand out</h2>
              <ul className="list-check">{r.portfolioTips!.map((t) => <li key={t}><Icon name="checkCircle" size="1.1rem" />{t}</li>)}</ul>
            </section>
          )}
        </div>
      )}

      {(r.interviewPrep?.length ?? 0) > 0 && (
        <section className="card stack">
          <h2 className="card-title"><Icon name="message" className="text-primary" /> Getting interview-ready</h2>
          <ol className="list-num">{r.interviewPrep!.map((t) => <li key={t}>{t}</li>)}</ol>
        </section>
      )}

      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="checkCircle" className="text-primary" /> This week</h2>
          <ol className="list-num">{r.nextSteps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="tag-list">{r.tools.map((t) => <span key={t} className="pill">{t}</span>)}</div>
        </section>
        {!shared && <ProgramFitCard fit={r} />}
      </div>
      {!shared && resources.length > 0 && (
        <section className="stack">
          <h2 className="card-title"><Icon name="book" className="text-primary" /> Free resources for your roadmap</h2>
          <div className="resource-list">
            {resources.map((res) => (
              <a key={res.id} className="resource" href={res.url} target="_blank" rel="noopener noreferrer">
                <span className="fc-icon"><Icon name={res.type === 'Course' ? 'award' : 'book'} /></span>
                <span style={{ flex: 1 }}><b>{res.title}</b><span>{res.provider} • {res.type}</span></span>
                <Icon name="external" size="1rem" className="muted" />
              </a>
            ))}
          </div>
        </section>
      )}
      {extras && <EligibilityNudge area={extras.area} done={extras.eligibilityDone} />}
      {extras && <PublishedStory />}
    </>
  )
}
