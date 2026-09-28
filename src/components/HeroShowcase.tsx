'use client'

import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { HERO_STATS, TESTIMONIALS, TESTIMONIALS_ARE_ILLUSTRATIVE } from '@/config/testimonials'
import { initials } from '@/lib/questions'

const EVERY_MS = 5000

/**
 * Hero collage: one learner featured large, the move they made, the next
 * learner alongside, and the headline numbers underneath.
 *
 * It advances on its own every few seconds, pausing while the pointer is over
 * it. Anyone who has asked for reduced motion gets a static first card and no
 * cycling at all — auto-rotating content is exactly what that setting is for.
 */
export function HeroShowcase() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setI((n) => (n + 1) % TESTIMONIALS.length), EVERY_MS)
    return () => window.clearInterval(id)
  }, [paused])

  const lead = TESTIMONIALS[i]
  const next = TESTIMONIALS[(i + 1) % TESTIMONIALS.length]

  return (
    <div
      className="showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={TESTIMONIALS_ARE_ILLUSTRATIVE ? 'Illustrative alumni stories' : 'Alumni stories'}
    >
      <figure className="sc-lead" key={`lead-${i}`}>
        <Portrait t={lead} />
        {lead.placedViaPartner && (
          <span className="sc-badge sc-badge-placed"><Icon name="check" size="0.85rem" /> Placed via partner</span>
        )}
        <figcaption className="sc-caption">
          <b>{lead.name}</b>
          <span>{lead.role}{lead.city ? ` · ${lead.city}` : ''}</span>
        </figcaption>
      </figure>

      <div className="sc-move" key={`move-${i}`}>
        <div>
          <span className="sc-move-label">From</span>
          <b>{lead.from}</b>
        </div>
        <Icon name="arrowRight" size="1rem" className="sc-move-arrow" />
        <div>
          <span className="sc-move-label">To</span>
          <b>{lead.to}</b>
        </div>
      </div>

      <figure className="sc-next" key={`next-${i}`}>
        <Portrait t={next} />
        {lead.hike && <span className="sc-badge sc-badge-hike">↑ {lead.hike} hike</span>}
      </figure>

      {HERO_STATS.length > 0 && (
        <div className="sc-stats">
          {HERO_STATS.map((s) => (
            <div key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
          <ul className="sc-faces" aria-hidden="true">
            {TESTIMONIALS.filter((t) => t.photo).slice(0, 5).map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={t.name}><img src={t.photo} alt="" width={64} height={64} /></li>
            ))}
          </ul>
        </div>
      )}

      <div className="sc-dots" role="tablist" aria-label="Choose a story">
        {TESTIMONIALS.map((t, n) => (
          <button
            key={t.name}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={`Story ${n + 1}: ${t.name}`}
            className={n === i ? 'on' : undefined}
            onClick={() => setI(n)}
          />
        ))}
      </div>
    </div>
  )
}

function Portrait({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  if (!t.photo) return <span className="sc-initials" aria-hidden="true">{initials(t.name)}</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="sc-photo" src={t.photo} alt="" width={320} height={420} />
}
