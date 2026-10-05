import Link from 'next/link'
import { Icon, type IconName } from '../Icon'
import { WhyLearnbayButton } from '../why/WhyLearnbayButton'
import { Gauge, KpiTiles } from './Charts'
import { getProgram } from '@/config/programs'
import { USPS, type UspId } from '@/config/usps'
import { curriculumOf } from '@/lib/roles'
import type { ReportSummary } from '@/lib/report-summary'

/** Top of every report: the one number that matters, what it means, and 3-4 key numbers. */
export function ReportHero({ summary, gauge }: { summary: ReportSummary; gauge?: number }) {
  const h = summary.headline
  return (
    <section className="report-hero">
      <div className="rh-main">
        {gauge !== undefined ? <Gauge value={gauge} label={h.label} /> : <p className="rh-big">{h.value}</p>}
        <div className="rh-text">
          {gauge === undefined && <span className="rh-label">{h.label}</span>}
          {gauge !== undefined && <span className="rh-label">{h.label.replace(/^\/100 /, '')}</span>}
          <p>{h.note}</p>
        </div>
      </div>
      <KpiTiles items={summary.kpis} />
    </section>
  )
}

/** A titled chart card. */
export function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card stack chart-card">
      <div>
        <h2 className="card-title">{title}</h2>
        {sub && <p className="card-sub">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

/** Collapsed detail for people who want to read more; skimmers don't have to. */
export function More({ title, count, children, open = false }: { title: string; count?: number; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="more" open={open}>
      <summary><span>{title}</span>{count !== undefined && <span className="pill">{count}</span>}<Icon name="chevronDown" size="1rem" className="more-chev" /></summary>
      <div className="more-body">{children}</div>
    </details>
  )
}

/** Compact, visual "how Learnbay helps with this" strip, instead of paragraphs. */
export function LearnbayEdge({ ids, programId, coverage, booked = false }: { ids: UspId[]; programId: string; coverage?: { covers: number; total: number }; booked?: boolean }) {
  const p = getProgram(programId)
  return (
    <section className="lb-edge">
      <div className="lb-edge-head">
        <span className="eyebrow">Recommended for you</span>
        <b>{p.name}</b>
        {coverage && <span className="lb-cover"><b>{coverage.covers}/{coverage.total}</b> of your gaps covered</span>}
      </div>
      <div className="lb-chips">
        {ids.map((id) => (
          <div className="lb-chip" key={id} title={USPS[id].detail}>
            <span className="usp-icon"><Icon name={USPS[id].icon} size="1.1rem" /></span>
            <span><b>{USPS[id].title}</b><small>{USPS[id].short}</small></span>
          </div>
        ))}
      </div>
      <div className="row">
        <Link href="/dashboard/sessions" className="btn btn-primary btn-sm">{booked ? 'See my booked call' : 'Talk to a Senior Counsellor, free'}</Link>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Program details <Icon name="external" size="0.85rem" /></a>
        <WhyLearnbayButton source="report-edge" className="btn btn-ghost btn-sm" label="How we're different" />
      </div>
    </section>
  )
}

/**
 * The bottom of the funnel, near the top of every report: the achievement this report points to, and the steps
 * with Learnbay that lead there (the ones already done are ticked, the next one is highlighted).
 */
export function OutcomePath({ goal, goalNote, programId, industry, eligibilityDone, hasSession, targetRole }: {
  /** The achievement, e.g. "AI Engineer at ₹18–28 LPA". */
  goal: string
  /** One line on where that number comes from (always honest: indicative, not a promise). */
  goalNote: string
  programId: string
  industry: string | null
  eligibilityDone: boolean
  hasSession: boolean
  targetRole: string
}) {
  const p = getProgram(programId)
  const course = curriculumOf(programId)
  const steps: { icon: IconName; title: string; text: string; done: boolean; href?: string; cta?: string }[] = [
    { icon: 'award', title: 'Check your eligibility', text: '10 quick questions, about 2 minutes, no maths.', done: eligibilityDone, href: '/dashboard/eligibility', cta: 'Take the test' },
    { icon: 'calendar', title: hasSession ? 'Your call with a Senior Counsellor is booked' : 'Free call with a Senior Counsellor', text: 'Your plan, fees and a scholarship check, on one call.', done: hasSession, href: '/dashboard/sessions', cta: 'Book my call' },
    { icon: 'play', title: `Learn live: ${p.name}`, text: `${course.liveHours ? course.liveHours.replace(/^./, (c) => c.toUpperCase()) : 'Live classes'} with industry mentors, around your job.`, done: false },
    { icon: 'folder', title: 'Build real proof', text: `${course.projectsCount ? course.projectsCount.replace(/^./, (c) => c.toUpperCase()) : 'Real industry projects'}${industry ? `, including your ${industry.charAt(0).toLowerCase()}${industry.slice(1)} domain` : ''}, for your portfolio.`, done: false },
    { icon: 'briefcase', title: `Get hired as ${/^[aeiou]/i.test(targetRole) ? 'an' : 'a'} ${targetRole}`, text: USPS.placement.short, done: false },
  ]
  const next = steps.findIndex((s) => !s.done)
  return (
    <section className="outcome" aria-label="Your outcome with Learnbay">
      <div className="outcome-goal">
        <span className="outcome-flag"><Icon name="target" size="1.1rem" /></span>
        <div>
          <span className="eyebrow">Where this can take you</span>
          <b>{goal}</b>
          <small>{goalNote}</small>
        </div>
      </div>
      <ol className="outcome-steps">
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? 'done' : i === next ? 'next' : ''}>
            <span className="outcome-dot">{s.done ? <Icon name="check" size="0.9rem" /> : <Icon name={s.icon} size="0.9rem" />}</span>
            <div>
              <b>{s.title}{i === next && <span className="outcome-here">You’re here</span>}</b>
              <small>{s.text}</small>
              {i === next && s.href && <Link href={s.href} className="btn btn-primary btn-sm outcome-cta">{s.cta} <Icon name="arrowRight" size="0.85rem" /></Link>}
            </div>
          </li>
        ))}
      </ol>
      <p className="xsmall muted">Learnbay supports every step; outcomes depend on your effort, and salary figures are indicative market ranges, not promises.</p>
    </section>
  )
}

/** One-line eligibility invitation. */
export function EligibilityStrip({ area }: { area: string }) {
  return (
    <Link href="/dashboard/eligibility" className="elig-strip">
      <span className="usp-icon"><Icon name="award" size="1.1rem" /></span>
      <span><b>Are you eligible for a {area} program?</b><small>10 quick questions · about 4 minutes · score straight away</small></span>
      <Icon name="arrowRight" size="1rem" />
    </Link>
  )
}
