import Link from 'next/link'
import { Icon } from '../Icon'
import { WhyLearnbayButton } from '../why/WhyLearnbayButton'
import { PUBLISHED_STORY, USPS, type UspId } from '@/config/usps'

/**
 * A quiet "how Learnbay approaches this" note placed between report sections.
 * Informational first: it explains an approach that helps with what the learner just read, then offers one soft link.
 */
export function UspNote({ usp, lead, points }: { usp: UspId; lead?: string; points?: string[] }) {
  const u = USPS[usp]
  return (
    <aside className="usp-note no-print" aria-label={`How Learnbay approaches this: ${u.title}`}>
      <span className="usp-icon"><Icon name={u.icon} /></span>
      <div className="stack" style={{ gap: '0.375rem' }}>
        <span className="eyebrow">How Learnbay approaches this</span>
        <b>{u.title}</b>
        <p className="small">{lead ? `${lead} ` : ''}{u.detail}</p>
        <ul className="usp-points">{(points ?? u.points).map((p) => <li key={p}><Icon name="check" size="0.9rem" />{p}</li>)}</ul>
        <WhyLearnbayButton source={`usp-${usp}`} className="link-btn small usp-link" label="How Learnbay is different" />
      </div>
    </aside>
  )
}

/** Soft invitation to the eligibility test, used inside reports. */
export function EligibilityNudge({ area, done }: { area: string; done?: boolean }) {
  if (done) return null
  return (
    <aside className="usp-note eligibility no-print">
      <span className="usp-icon"><Icon name="award" /></span>
      <div className="stack" style={{ gap: '0.375rem' }}>
        <span className="eyebrow">Next step, when you are ready</span>
        <b>Are you eligible for a {area} program?</b>
        <p className="small">A friendly 4-minute test: 10 short, easy questions on aptitude, common full forms and {area} basics. You get your score straight away, and a counsellor helps you choose the right track.</p>
        <Link href="/dashboard/eligibility" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>Take the eligibility test <Icon name="arrowRight" size="0.9rem" /></Link>
      </div>
    </aside>
  )
}

/** One real learner story, as published by Learnbay. */
export function PublishedStory() {
  return (
    <aside className="usp-story no-print">
      <Icon name="message" className="text-primary" />
      <blockquote>“{PUBLISHED_STORY.quote}”<cite>{PUBLISHED_STORY.name}, {PUBLISHED_STORY.role} · as published on {PUBLISHED_STORY.source}</cite></blockquote>
    </aside>
  )
}

/** A compact "why Learnbay" band for public share links: four strengths and a Senior Counsellorship call. */
export function LearnbayPitch({ ids, toolId }: { ids: UspId[]; toolId: string }) {
  return (
    <section className="learnbay-pitch">
      <div>
        <span className="eyebrow">Why learners choose Learnbay</span>
        <h2>Turn a report like this into a career move</h2>
      </div>
      <div className="pitch-grid">
        {ids.map((id) => (
          <div key={id} className="pitch-card">
            <span className="usp-icon"><Icon name={USPS[id].icon} /></span>
            <b>{USPS[id].title}</b>
            <span className="small muted">{USPS[id].short}</span>
          </div>
        ))}
      </div>
      <blockquote className="why-story">“{PUBLISHED_STORY.quote}”<cite>{PUBLISHED_STORY.name}, {PUBLISHED_STORY.role} · as published on {PUBLISHED_STORY.source}</cite></blockquote>
      <div className="row">
        <Link href={`/start?tool=${toolId}`} className="btn btn-primary">Get my own free analysis</Link>
        <Link href="/start?tool=sessions" className="btn btn-outline">Book a free counselling call</Link>
      </div>
    </section>
  )
}
