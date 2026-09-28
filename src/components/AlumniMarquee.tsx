import { TESTIMONIALS, TESTIMONIALS_ARE_ILLUSTRATIVE } from '@/config/testimonials'
import { initials } from '@/lib/questions'

/**
 * Alumni stories drifting right to left in the hero.
 *
 * The track holds the list twice and slides exactly half its own width, so the
 * second copy is in the first copy's place when the loop restarts and the seam
 * is invisible. The duplicate is hidden from assistive tech, which would
 * otherwise read every story a second time.
 */
export function AlumniMarquee() {
  const loop = [...TESTIMONIALS, ...TESTIMONIALS]
  return (
    <div className="alum-rail">
      <p className="alum-rail-label">{TESTIMONIALS_ARE_ILLUSTRATIVE ? 'Illustrative alumni stories' : 'Alumni stories'}</p>
      <div className="marquee">
        <div className="marquee-track">
          {loop.map((t, i) => {
            const copy = i >= TESTIMONIALS.length
            return (
              <article className="alum-card" key={`${t.name}-${i}`} aria-hidden={copy || undefined}>
                {t.photo
                  // eslint-disable-next-line @next/next/no-img-element
                  /* Not lazy: the track scrolls by transform, so a card can slide
                     into view before a lazy load fires and show blank. They are
                     ~30KB each. */
                  ? <img className="alum-photo" src={t.photo} alt="" width={320} height={420} />
                  : <span className="alum-initials" aria-hidden="true">{initials(t.name)}</span>}
                <div className="alum-glass">
                  <b className="alum-name">{t.name}</b>
                  <span className="alum-meta">{t.role} · {t.company}</span>
                  <p className="alum-quote">“{t.quote}”</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
