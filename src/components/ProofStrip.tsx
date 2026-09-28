import { Icon } from './Icon'
import { PROOF_POINTS } from '@/config/testimonials'

export function ProofStrip() {
  return (
    <section aria-label="Why Learnbay">
      {/* Same card treatment as the landing page, so the points read the
          same wherever they appear. */}
      <ul className="feature-cards">
        {PROOF_POINTS.map((p) => (
          <li key={p.title}>
            <span className="feature-icon"><Icon name={p.icon} size="1.25rem" /></span>
            <b>{p.title}</b>
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
      <p className="proof-source">Source: learnbay.co program information.</p>
    </section>
  )
}
