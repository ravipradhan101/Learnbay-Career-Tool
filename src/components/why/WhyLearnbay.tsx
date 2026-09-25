'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { OPEN_WHY_EVENT } from './WhyLearnbayButton'
import { COMPARISON, LAB_CITIES, PUBLISHED_STORY, USPS, type UspId } from '@/config/usps'
import { track } from '@/lib/analytics'
import { trackEvent } from '@/lib/track'

const PRIORITIES: { id: string; label: string; usp: UspId }[] = [
  { id: 'projects', label: 'Real, hands-on projects', usp: 'projects' },
  { id: 'mentors', label: 'Live teaching and doubt support', usp: 'mentors' },
  { id: 'placement', label: 'Help landing the job', usp: 'placement' },
  { id: 'flexibility', label: 'Fits around my job', usp: 'hybrid' },
  { id: 'domain', label: 'Relevance to my industry', usp: 'domain' },
  { id: 'certification', label: 'A recognised certificate', usp: 'certification' },
]
const BLOCKERS: { id: string; label: string; usp: UspId; answer: string }[] = [
  { id: 'generic', label: 'Courses felt too generic for my background', usp: 'customisation', answer: 'Role-specific tracks start from your current job, so you skip what you already know.' },
  { id: 'theory', label: 'Too much theory, not enough doing', usp: 'projects', answer: 'Every program is project-based: capstones plus real problem statements from AI companies.' },
  { id: 'alone', label: 'No one to ask when I got stuck', usp: 'mentors', answer: 'Live classes with industry mentors, and 24/7 student support between classes.' },
  { id: 'time', label: 'Hard to fit around work', usp: 'hybrid', answer: 'Live online classes built for working professionals, with a hybrid option if you want in-person project time.' },
  { id: 'after', label: 'Unclear what happens after the course', usp: 'placement', answer: 'Placement support with mock interviews, resume build-up and interview calls.' },
  { id: 'first', label: 'This is my first time upskilling', usp: 'customisation', answer: 'A guided path matched to your background, with a counsellor to help you pick the right track.' },
]
const MODES = [
  { id: 'live', label: 'Live online classes', hint: 'Learn from anywhere, in real time' },
  { id: 'hybrid', label: 'Online plus some in-person project work', hint: 'At a Project Innovation Lab' },
  { id: 'unsure', label: 'Not sure yet', hint: 'A counsellor can help you decide' },
]
const PAGES = 5

export type WhyProfile = { role: string; interest: string; city: string | null; program: { name: string; url: string; features: string[] } }

export function WhyLearnbay({ profile }: { profile: WhyProfile }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [priorities, setPriorities] = useState<string[]>([])
  const [blocker, setBlocker] = useState('')
  const [mode, setMode] = useState('')
  const source = useRef('')
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      source.current = String((e as CustomEvent).detail?.source ?? '')
      setPage(0)
      setOpen(true)
      track('step_view', 'why:1', { source: source.current })
    }
    window.addEventListener(OPEN_WHY_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WHY_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    if (page < PAGES - 1) track('action', 'why_learnbay_closed', { page: page + 1 })
    setOpen(false)
  }
  function go(n: number) {
    setPage(n)
    track('step_view', `why:${n + 1}`)
    if (n === PAGES - 1) trackEvent('why_learnbay_completed', { priorities: priorities.join(','), blocker, mode })
  }
  const togglePriority = (id: string) =>
    setPriorities((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]))

  if (!open) return null
  const canNext = page === 0 ? priorities.length > 0 : page === 1 ? Boolean(blocker) : page === 2 ? Boolean(mode) : true
  const chosen = PRIORITIES.filter((p) => priorities.includes(p.id))
  const block = BLOCKERS.find((b) => b.id === blocker)
  const lab = profile.city ? LAB_CITIES[profile.city] : undefined
  const highlight = new Set<UspId>([...chosen.map((c) => c.usp), ...(block ? [block.usp] : []), ...(mode === 'hybrid' ? ['hybrid' as UspId] : [])])

  return (
    <div className="modal-backdrop why-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="why-modal" role="dialog" aria-modal="true" aria-labelledby="why-title" tabIndex={-1} ref={dialog}>
        <div className="why-top">
          <div className="why-dots" aria-label={`Screen ${page + 1} of ${PAGES}`}>{Array.from({ length: PAGES }, (_, i) => <i key={i} className={i <= page ? 'on' : undefined} />)}</div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}><Icon name="x" /></button>
        </div>
        <div className="why-viewport">
          <div className="why-track" style={{ transform: `translateX(-${page * 100}%)` }}>
            {/* 1 */}
            <section className="why-page" aria-hidden={page !== 0}>
              <span className="eyebrow">How Learnbay is different · 1 of 5</span>
              <h2 id="why-title">What matters most to you in a program?</h2>
              <p className="muted small">Pick up to two.</p>
              <div className="option-list">
                {PRIORITIES.map((p) => (
                  <button key={p.id} type="button" className="option" aria-pressed={priorities.includes(p.id)} onClick={() => togglePriority(p.id)} tabIndex={page === 0 ? 0 : -1}>
                    <span className="option-icon"><Icon name={USPS[p.usp].icon} /></span>{p.label}
                  </button>
                ))}
              </div>
            </section>
            {/* 2 */}
            <section className="why-page" aria-hidden={page !== 1}>
              <span className="eyebrow">2 of 5</span>
              <h2>What has held you back before?</h2>
              <p className="muted small">Be honest. There is no wrong answer.</p>
              <div className="option-list">
                {BLOCKERS.map((b) => (
                  <button key={b.id} type="button" role="radio" aria-checked={blocker === b.id} className="option" onClick={() => setBlocker(b.id)} tabIndex={page === 1 ? 0 : -1}>
                    <span className="option-mark" />{b.label}
                  </button>
                ))}
              </div>
            </section>
            {/* 3 */}
            <section className="why-page" aria-hidden={page !== 2}>
              <span className="eyebrow">3 of 5</span>
              <h2>How do you prefer to learn?</h2>
              <div className="option-list">
                {MODES.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className="option" onClick={() => setMode(m.id)} tabIndex={page === 2 ? 0 : -1}>
                    <span className="option-mark" />{m.label}<span className="hint" style={{ marginLeft: 'auto' }}>{m.hint}</span>
                  </button>
                ))}
              </div>
            </section>
            {/* 4 */}
            <section className="why-page" aria-hidden={page !== 3}>
              <span className="eyebrow">4 of 5</span>
              <h2>Built differently, where it matters to you</h2>
              <p className="muted small">Highlighted rows match what you told us.</p>
              <div className="why-compare">
                <div className="why-compare-head"><span /><span>Typical courses</span><span>Learnbay</span></div>
                {COMPARISON.map((c) => (
                  <div key={c.area} className={`why-compare-row${highlight.has(c.usp) ? ' hl' : ''}`}>
                    <b>{c.area}</b>
                    <span className="muted"><Icon name="x" size="0.85rem" /> {c.others}</span>
                    <span><Icon name="checkCircle" size="0.9rem" className="text-success" /> {c.learnbay}</span>
                  </div>
                ))}
              </div>
              <p className="xsmall muted">Comparison as published on learnbay.co.</p>
            </section>
            {/* 5 */}
            <section className="why-page why-summary" aria-hidden={page !== 4}>
              <span className="eyebrow">Your Learnbay fit</span>
              <h2>{profile.role} → {profile.interest}</h2>
              <div className="why-grid">
                {chosen.map((c) => (
                  <div className="why-card" key={c.id}>
                    <span className="fc-icon"><Icon name={USPS[c.usp].icon} /></span>
                    <small>You care about: {c.label.toLowerCase()}</small>
                    <b>{USPS[c.usp].title}</b>
                    <p>{USPS[c.usp].short}</p>
                  </div>
                ))}
                {block && (
                  <div className="why-card accent">
                    <span className="fc-icon"><Icon name="bulb" /></span>
                    <small>What held you back: {block.label.toLowerCase()}</small>
                    <b>How that changes here</b>
                    <p>{block.answer}</p>
                  </div>
                )}
                <div className="why-card">
                  <span className="fc-icon"><Icon name="grid" /></span>
                  <small>How you like to learn</small>
                  <b>{mode === 'hybrid' ? 'Hybrid learning' : mode === 'live' ? '100% live online' : 'Live online or hybrid'}</b>
                  <p>{mode === 'hybrid' && lab ? `There is a Learnbay Project Innovation Lab in ${lab} for in-person project work.` : mode === 'hybrid' ? 'In-person project work at Project Innovation Labs in 7 cities.' : USPS.hybrid.short}</p>
                </div>
                <div className="why-card program">
                  <span className="fc-icon"><Icon name="award" /></span>
                  <small>Suggested for your goal</small>
                  <b>{profile.program.name}</b>
                  <p>{profile.program.features.join(' · ')}</p>
                  <a href={profile.program.url} target="_blank" rel="noopener noreferrer" className="small">Program details <Icon name="external" size="0.8rem" /></a>
                </div>
              </div>
              <blockquote className="why-story">“{PUBLISHED_STORY.quote}”<cite>{PUBLISHED_STORY.name}, {PUBLISHED_STORY.role} · as published on {PUBLISHED_STORY.source}</cite></blockquote>
              <div className="row">
                <Link href="/dashboard/eligibility" className="btn btn-primary" onClick={() => setOpen(false)}>Check my eligibility</Link>
                <Link href="/dashboard/sessions" className="btn btn-outline" onClick={() => setOpen(false)}>Talk to a counsellor</Link>
              </div>
            </section>
          </div>
        </div>
        <div className="why-nav">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => go(page - 1)}><Icon name="arrowLeft" size="1rem" /> Back</button>
          {page < PAGES - 1
            ? <button type="button" className="btn btn-primary btn-sm" disabled={!canNext} onClick={() => go(page + 1)}>{page === 3 ? 'See my summary' : 'Next'} <Icon name="arrowRight" size="1rem" /></button>
            : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>}
        </div>
      </div>
    </div>
  )
}
