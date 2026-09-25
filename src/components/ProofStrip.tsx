import { Icon } from './Icon'
import { PROOF_POINTS } from '@/config/testimonials'

export function ProofStrip() {
  return (
    <section aria-label="Why Learnbay">
      <div className="proof-strip">
        {PROOF_POINTS.map((p) => (
          <div className="proof" key={p.title}>
            <span className="fc-icon"><Icon name={p.icon} /></span>
            <span><b>{p.title}</b><span>{p.text}</span></span>
          </div>
        ))}
      </div>
      <p className="proof-source">Source: learnbay.co program information.</p>
    </section>
  )
}
