'use client'

import { Icon } from '../Icon'

export const OPEN_WHY_EVENT = 'lcn:open-why-learnbay'

/** Opens the "How Learnbay is different" walkthrough from anywhere in the studio. */
export function openWhyLearnbay(source: string) {
  window.dispatchEvent(new CustomEvent(OPEN_WHY_EVENT, { detail: { source } }))
}

export function WhyLearnbayButton({ source, className = 'btn btn-outline btn-sm', label = 'How Learnbay is different' }: { source: string; className?: string; label?: string }) {
  return (
    <button type="button" className={className} onClick={() => openWhyLearnbay(source)} data-track={`Why Learnbay (${source})`}>
      <Icon name="sparkles" size="1rem" /> {label}
    </button>
  )
}

/** Compact teaser card used on the studio home and inside reports. */
export function WhyLearnbayTeaser({ source }: { source: string }) {
  return (
    <section className="why-teaser no-print">
      <div>
        <span className="eyebrow">1 minute · 5 quick screens</span>
        <b>How is Learnbay different from other institutes?</b>
        <span className="small muted">Answer 3 quick questions and see what matters for your move, side by side.</span>
      </div>
      <WhyLearnbayButton source={source} className="btn btn-primary btn-sm" label="See the difference" />
    </section>
  )
}
