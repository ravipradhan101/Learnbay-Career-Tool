import Link from 'next/link'
import { Icon } from '../Icon'
import { WhyLearnbayButton } from '../why/WhyLearnbayButton'
import { Gauge, KpiTiles } from './Charts'
import { getProgram } from '@/config/programs'
import { USPS, type UspId } from '@/config/usps'
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
export function LearnbayEdge({ ids, programId, coverage }: { ids: UspId[]; programId: string; coverage?: { covers: number; total: number } }) {
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
        <Link href="/dashboard/sessions" className="btn btn-primary btn-sm">Talk to a mentor, free</Link>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Program details <Icon name="external" size="0.85rem" /></a>
        <WhyLearnbayButton source="report-edge" className="btn btn-ghost btn-sm" label="How we're different" />
      </div>
    </section>
  )
}

/** One-line eligibility invitation. */
export function EligibilityStrip({ area }: { area: string }) {
  return (
    <Link href="/dashboard/eligibility" className="elig-strip">
      <span className="usp-icon"><Icon name="award" size="1.1rem" /></span>
      <span><b>Are you eligible for a {area} program?</b><small>Ten questions, about four minutes, and you get your score right away.</small></span>
      <Icon name="arrowRight" size="1rem" />
    </Link>
  )
}
