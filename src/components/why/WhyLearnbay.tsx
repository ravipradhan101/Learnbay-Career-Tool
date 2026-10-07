'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '../Icon'
import { OPEN_WHY_EVENT } from './WhyLearnbayButton'
import { LAB_CITIES, PUBLISHED_STORY } from '@/config/usps'
import { curriculumOf } from '@/lib/roles'
import { track } from '@/lib/analytics'
import { trackEvent } from '@/lib/track'

export type WhyProfile = {
  role: string; interest: string; city: string | null
  program: { id?: string; name: string; url: string; features: string[] }
  /** Their industry in the catalogue's words (e.g. "Banking & BFSI"), to pick a capstone from their world. */
  industry?: string | null
}

type Round = { id: string; icon: IconName; area: string; typical: string; learnbay: string; forYou: string }

/**
 * "How Learnbay is different" as a 60-second game. The first screen already shows the difference side by side,
 * personalised to their program; then six quick "which one is Learnbay?" rounds, each revealing what it means for
 * them; then their score and summary. Every fact comes from the 2026 catalogue or Learnbay's published comparison.
 */
export function WhyLearnbay({ profile }: { profile: WhyProfile }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0) // 0 = hook, 1..n = rounds, n+1 = result
  const [picked, setPicked] = useState<Record<string, 'right' | 'wrong'>>({})
  const source = useRef('')
  const dialog = useRef<HTMLDivElement>(null)

  const course = useMemo(() => curriculumOf(profile.program.id ?? ''), [profile.program.id])
  const capstone = useMemo(() => {
    // Their own industry's capstone when the program has one (exact catalogue industry names), else the first.
    return course.projects.find((p) => profile.industry && p.domain === profile.industry) ?? course.projects[0]
  }, [course.projects, profile.industry])
  const spec = course.electives.slice(0, 3)
  const lab = profile.city ? LAB_CITIES[profile.city] : undefined

  const rounds: Round[] = useMemo(() => [
    { id: 'live', icon: 'users', area: 'How you learn', typical: 'Mostly recorded videos, a few live sessions', learnbay: '100% live classes with industry mentors, online or hybrid', forYou: lab ? `Live online, with in-person project time at the Learnbay lab in ${lab} if you want it.` : 'Live online classes you can ask questions in, built around a working day.' },
    { id: 'fit', icon: 'target', area: 'Built for whom', typical: 'One generic curriculum for everyone', learnbay: `A program for your starting point${spec.length ? `, with tracks like ${spec.slice(0, 2).join(' and ')}` : ''}`, forYou: `${profile.program.name}: matched to a ${profile.role.toLowerCase()} moving into ${profile.interest}.` },
    { id: 'projects', icon: 'folder', area: 'Projects', typical: 'Toy projects and simulations', learnbay: 'Projects in every module, plus industry capstones', forYou: capstone ? `A capstone like “${capstone.title}” (${capstone.domain}): ${capstone.objective}` : 'Capstones drawn from real industry scenarios.' },
    { id: 'ai', icon: 'sparkles', area: 'Today’s AI tools', typical: 'Tools from a few years ago', learnbay: 'Claude, Claude Code, GitHub Copilot and MCP taught as a real module', forYou: 'You learn the AI tools teams are adopting now, tailored to your kind of work.' },
    { id: 'support', icon: 'message', area: 'When you’re stuck', typical: 'Limited support hours', learnbay: 'A project mentor, 1:1 doubt clearing and 24/7 student support', forYou: 'Someone to ask, every time, so you never stall for a week on one bug or concept.' },
    { id: 'after', icon: 'briefcase', area: 'After the course', typical: 'A certificate, then you’re on your own', learnbay: 'Mock interviews, resume build-up and interview calls', forYou: course.certifications[0] ? `Plus your certificates: ${course.certifications[0]}.` : 'Plus recognised certification for your program.' },
  ], [capstone, course.certifications, lab, profile.interest, profile.program.name, profile.role, spec])

  // Which side Learnbay sits on in each round (fixed per open, so it can't be guessed by position).
  const [sides, setSides] = useState<boolean[]>([])

  useEffect(() => {
    const onOpen = (e: Event) => {
      source.current = String((e as CustomEvent).detail?.source ?? '')
      setStep(0)
      setPicked({})
      setSides(Array.from({ length: 6 }, () => Math.random() < 0.5))
      setOpen(true)
      track('step_view', 'why:hook', { source: source.current })
    }
    window.addEventListener(OPEN_WHY_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WHY_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const last = rounds.length + 1
  const score = Object.values(picked).filter((v) => v === 'right').length
  const go = (n: number) => {
    setStep(n)
    if (n === last) trackEvent('why_learnbay_completed', { score: String(score), of: String(rounds.length) })
    else track('step_view', n === 0 ? 'why:hook' : `why:round:${n}`)
  }
  const round = step >= 1 && step <= rounds.length ? rounds[step - 1] : null
  const answered = round ? picked[round.id] : undefined
  const choose = (isLearnbay: boolean) => {
    if (!round || answered) return
    setPicked((p) => ({ ...p, [round.id]: isLearnbay ? 'right' : 'wrong' }))
    track('action', 'why:pick', { round: round.id, right: String(isLearnbay) })
  }

  return (
    <div className="modal-backdrop why-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="wl" role="dialog" aria-modal="true" aria-labelledby="wl-title" tabIndex={-1} ref={dialog}>
        <div className="wl-top">
          <div className="wl-stars" aria-label={`${score} of ${rounds.length} stars`}>
            {rounds.map((r) => <span key={r.id} className={picked[r.id] === 'right' ? 'on' : picked[r.id] ? 'miss' : ''}>★</span>)}
          </div>
          <button type="button" className="wl-x" aria-label="Close" onClick={() => setOpen(false)}><Icon name="x" /></button>
        </div>

        {step === 0 && (
          <section className="wl-page wl-hook">
            <span className="wl-eyebrow">How Learnbay is different</span>
            <h2 id="wl-title">Same goal. A very different way to get there.</h2>
            <div className="wl-vs">
              <div className="wl-side typical">
                <b>Typical course</b>
                <ul>
                  <li><Icon name="x" size="0.85rem" /> Recorded videos</li>
                  <li><Icon name="x" size="0.85rem" /> Same syllabus for everyone</li>
                  <li><Icon name="x" size="0.85rem" /> Toy projects</li>
                  <li><Icon name="x" size="0.85rem" /> On your own after</li>
                </ul>
              </div>
              <span className="wl-vs-badge">VS</span>
              <div className="wl-side learnbay">
                <b>{profile.program.name}</b>
                <ul>
                  <li><Icon name="check" size="0.85rem" /> Live classes with industry mentors</li>
                  <li><Icon name="check" size="0.85rem" /> {spec.length ? `Tracks: ${spec.slice(0, 2).join(', ')}` : `Built for ${profile.interest}`}</li>
                  <li><Icon name="check" size="0.85rem" /> {capstone ? `Capstone: ${capstone.title}` : 'Industry capstones'}</li>
                  <li><Icon name="check" size="0.85rem" /> Interview prep and interview calls</li>
                </ul>
              </div>
            </div>
            <button type="button" className="wl-play" onClick={() => go(1)}>
              <Icon name="play" size="1rem" /> Play “spot the difference” · 6 quick rounds
            </button>
            <button type="button" className="wl-skip" onClick={() => go(last)}>Skip to my summary</button>
          </section>
        )}

        {round && (
          <section className="wl-page wl-round" key={round.id}>
            <span className="wl-eyebrow">Round {step} of {rounds.length} · {round.area}</span>
            <h2 id="wl-title">Which one is Learnbay?</h2>
            <div className="wl-pick">
              {[sides[step - 1], !sides[step - 1]].map((isLearnbay, i) => {
                const text = isLearnbay ? round.learnbay : round.typical
                const state = !answered ? '' : isLearnbay ? 'is-lb' : 'is-typical'
                return (
                  <button key={i} type="button" className={`wl-card ${state}`} disabled={Boolean(answered)} onClick={() => choose(isLearnbay)}>
                    <span className="wl-card-icon"><Icon name={answered ? (isLearnbay ? 'checkCircle' : 'x') : round.icon} size="1.2rem" /></span>
                    <span>{text}</span>
                    {answered && <small>{isLearnbay ? 'Learnbay' : 'Typical course'}</small>}
                  </button>
                )
              })}
            </div>
            {answered && (
              <div className={`wl-reveal ${answered}`} role="status">
                <b>{answered === 'right' ? 'Spot on! +1 ★' : 'That one’s the typical course.'}</b>
                <p><span>For you:</span> {round.forYou}</p>
                <button type="button" className="wl-next" onClick={() => go(step + 1)}>{step === rounds.length ? 'See my result' : 'Next round'} <Icon name="arrowRight" size="0.95rem" /></button>
              </div>
            )}
          </section>
        )}

        {step === last && (
          <section className="wl-page wl-result">
            <span className="wl-eyebrow">Your result</span>
            <h2 id="wl-title">{score >= 5 ? 'You know exactly what to look for.' : score >= 3 ? 'Nicely spotted.' : 'Now you know what to look for.'}</h2>
            <p className="wl-score"><b>{score}</b>/{rounds.length} differences spotted</p>
            <div className="wl-summary">
              {rounds.slice(0, 3).concat(rounds[5]).map((r) => (
                <div key={r.id} className="wl-sum-card">
                  <span className="wl-card-icon"><Icon name={r.icon} size="1rem" /></span>
                  <div><b>{r.learnbay}</b><small>{r.forYou}</small></div>
                </div>
              ))}
            </div>
            <blockquote className="why-story">“{PUBLISHED_STORY.quote}”<cite>{PUBLISHED_STORY.name}, {PUBLISHED_STORY.role} · as published on {PUBLISHED_STORY.source}</cite></blockquote>
            <div className="wl-actions">
              <Link href="/dashboard/sessions" className="wl-play" onClick={() => setOpen(false)}>Talk to a Senior Counsellor, free</Link>
              <a href={profile.program.url} target="_blank" rel="noopener noreferrer" className="wl-skip">Program details <Icon name="external" size="0.8rem" /></a>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
