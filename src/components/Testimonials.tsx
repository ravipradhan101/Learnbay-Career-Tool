'use client'

import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { TESTIMONIALS, TESTIMONIALS_ARE_ILLUSTRATIVE } from '@/config/testimonials'
import { initials } from '@/lib/questions'

export function Testimonials({ title = 'Career moves that started with clarity' }: { title?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(TESTIMONIALS.length / 3))

  function scroll(dir: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="t-title">
      <div className="testimonials-head">
        <div>
          <h2 id="t-title">{title}</h2>
          <p>{TESTIMONIALS_ARE_ILLUSTRATIVE ? 'Illustrative alumni stories' : 'Alumni stories'}</p>
        </div>
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'nowrap' }}>
          <button type="button" className="round-btn" aria-label="Previous stories" onClick={() => scroll(-1)}><Icon name="chevronLeft" size="1rem" /></button>
          <button type="button" className="round-btn" aria-label="Next stories" onClick={() => scroll(1)}><Icon name="chevronRight" size="1rem" /></button>
        </div>
      </div>
      <div
        className="t-track"
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget
          setPage(Math.round((el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)) * (pages - 1)))
        }}
      >
        {TESTIMONIALS.map((t) => (
          <article className="t-card" key={t.name}>
            {t.photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className="t-avatar" src={t.photo} alt="" width={68} height={68} />
              : <span className="t-avatar" aria-hidden="true">{initials(t.name)}</span>}
            <div>
              <b>{t.name}</b>
              <span className="t-meta">{t.role} · {t.company}</span>
              <p className="t-quote">“{t.quote}”</p>
              <span className="t-move">{t.from} → {t.to}</span>
            </div>
          </article>
        ))}
      </div>
      {pages > 1 && <div className="t-dots" aria-hidden="true">{Array.from({ length: pages }, (_, i) => <i key={i} className={i === page ? 'on' : ''} />)}</div>}
    </section>
  )
}
