import Link from 'next/link'
import { Icon } from '../Icon'

export type JourneyStep = { label: string; href: string; done: boolean }

/**
 * The learner's whole journey on one line: what's done, what's next, and how far along they are.
 * Seeing "2 of 5 done" pulls people back to finish.
 */
export function JourneyProgress({ steps }: { steps: JourneyStep[] }) {
  const done = steps.filter((s) => s.done).length
  const next = steps.findIndex((s) => !s.done)
  return (
    <section className="journey" aria-label="Your progress">
      <div className="row between">
        <b>Your career plan: {done} of {steps.length} steps done</b>
        {next >= 0 && <Link href={steps[next].href} className="btn btn-primary btn-sm">Next: {steps[next].label} <Icon name="arrowRight" size="0.9rem" /></Link>}
      </div>
      <div className="journey-bar" aria-hidden="true"><i style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <div className="journey-steps">
        {steps.map((s, i) => (
          <Link key={s.label} href={s.href} className={`journey-step${s.done ? ' done' : i === next ? ' next' : ''}`}>
            <span className="js-dot">{s.done ? <Icon name="check" size="0.8rem" /> : i + 1}</span>
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
