'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AssistantChat, type ChatMsg } from '../AssistantChat'
import { Icon } from '../Icon'
import { Sparkle } from '../Sparkle'
import { TOOLS, type ToolId } from '@/lib/tools-meta'
import { track } from '@/lib/analytics'
import { trackEvent } from '@/lib/track'

function StepArt() {
  return (
    <svg viewBox="0 0 176 120" className="nextstep-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="na-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfdbfe" /><stop offset="1" stopColor="#60a5fa" /></linearGradient>
        <linearGradient id="na-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#93c5fd" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
        <linearGradient id="na-o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fed7aa" /><stop offset="1" stopColor="#f97316" /></linearGradient>
      </defs>
      <ellipse cx="96" cy="104" rx="76" ry="8" fill="#e0ecff" />
      <rect x="18" y="70" width="44" height="18" rx="6" fill="url(#na-b)" />
      <rect x="70" y="52" width="40" height="36" rx="6" fill="url(#na-c)" />
      <rect x="118" y="26" width="40" height="62" rx="6" fill="url(#na-o)" />
      <path d="M30 60 C70 50 100 36 132 16" stroke="#fdba74" strokeWidth="2" fill="none" strokeDasharray="3 4" />
      <path d="M140 4l2.2 6 6 2.2-6 2.2-2.2 6-2.2-6-6-2.2 6-2.2z" fill="#f97316" />
    </svg>
  )
}

const FIRST_PICK_KEY = 'lcn_first_pick_v1'

export function AdvisorHome({ userId, name, done, initialMessages, initialConversationId }: {
  userId: string
  name: string
  done: ToolId[]
  initialMessages: ChatMsg[]
  initialConversationId: string | null
}) {
  const router = useRouter()
  const [showOther, setShowOther] = useState(false)
  const [pick, setPick] = useState(false)
  const [reset, setReset] = useState(0)
  const next = TOOLS.find((t) => !done.includes(t.id))
  const others = TOOLS.filter((t) => t.id !== next?.id)

  // First visit: ask what they want to check first (once per learner per browser).
  useEffect(() => {
    if (done.length) return
    try {
      if (window.localStorage.getItem(`${FIRST_PICK_KEY}:${userId}`)) return
    } catch {
      // ignore
    }
    setPick(true)
    track('step_view', 'first_pick:modal')
  }, [done.length, userId])

  function choose(href: string, id: string) {
    try { window.localStorage.setItem(`${FIRST_PICK_KEY}:${userId}`, id) } catch { /* ignore */ }
    trackEvent('first_pick', { tool: id })
    setPick(false)
    router.push(href)
  }

  const greeting = !done.length
    ? `Thanks, ${name}. Before recommending the right career track for you, we recommend understanding your current skill gaps first.`
    : next
      ? `Nice work, ${name}. You have completed ${done.length} of ${TOOLS.length} tools. Here is what I would look at next.`
      : `You have completed every tool, ${name}. The fastest next step is a free session with a mentor who can turn this into a plan.`

  return (
    <section className="advisor" aria-labelledby="advisor-title">
      <div className="advisor-head">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <span className="sparkle"><Sparkle size="1.6rem" /></span>
          <div>
            <b id="advisor-title">Your AI Career Advisor</b>
            <span>Personalized guidance for your next move</span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReset((n) => n + 1)}>
          <Icon name="plus" size="1rem" /> <span className="cta-long">New conversation</span>
        </button>
      </div>

      <div className="bubble-row">
        <span className="sparkle"><Sparkle /></span>
        <div className="bubble">{greeting}</div>
      </div>

      {next ? (
        <div className="nextstep">
          <div>
            <span className="pill-accent">Recommended next step</span>
            <div className="nextstep-title">
              <span className="fc-icon"><Icon name={next.icon} size="1.4rem" /></span>
              <div>
                <h2>{next.name}</h2>
                <p className="small muted">{next.tagline}</p>
              </div>
            </div>
            <ul className="ticks">
              {next.bullets.map((b) => <li key={b}><Icon name="check" size="1.1rem" />{b}</li>)}
            </ul>
            <div className="nextstep-actions">
              <Link href={next.route} className="btn btn-primary">Start {next.name} <Icon name="arrowRight" size="1rem" /></Link>
              <button type="button" className="btn btn-outline" aria-expanded={showOther} onClick={() => setShowOther((s) => !s)}>
                {showOther ? 'Hide other options' : 'Show Me Other Options'}
              </button>
            </div>
            <p className="xsmall muted" style={{ marginTop: '0.75rem' }}>Explore at your pace. Your advisor is here to guide you.</p>
          </div>
          <StepArt />
        </div>
      ) : (
        <div className="nextstep">
          <div>
            <span className="pill-accent">Recommended next step</span>
            <div className="nextstep-title">
              <span className="fc-icon"><Icon name="calendar" size="1.4rem" /></span>
              <div><h2>Career Strategy Session</h2><p className="small muted">Walk through your results with a Learnbay mentor.</p></div>
            </div>
            <div className="nextstep-actions">
              <Link href="/dashboard/sessions" className="btn btn-primary">Book a free session <Icon name="arrowRight" size="1rem" /></Link>
              <button type="button" className="btn btn-outline" onClick={() => setShowOther((s) => !s)}>{showOther ? 'Hide results' : 'Review my results'}</button>
            </div>
          </div>
          <StepArt />
        </div>
      )}

      {showOther && (
        <div className="other-options">
          {(next ? others : TOOLS).map((t) => (
            <Link key={t.id} href={t.route} className="tool-card">
              <span className="fc-icon"><Icon name={t.icon} /></span>
              <span style={{ flex: 1 }}>
                <b>{t.name} {done.includes(t.id) && <span className="pill success" style={{ marginLeft: '0.25rem' }}>Ready</span>}</b>
                <span>{t.tagline}</span>
              </span>
              <Icon name="chevronRight" size="1rem" className="muted" />
            </Link>
          ))}
          <Link href="/dashboard/sessions" className="tool-card">
            <span className="fc-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name="calendar" /></span>
            <span style={{ flex: 1 }}><b>Career Strategy Session</b><span>Talk to a Learnbay mentor on a date and time you choose.</span></span>
            <Icon name="chevronRight" size="1rem" className="muted" />
          </Link>
        </div>
      )}

      <AssistantChat
        context="advisor"
        signedIn
        initialMessages={initialMessages}
        initialConversationId={initialConversationId}
        newChatSignal={reset}
        suggestions={['Which role suits my background?', 'What should I learn first?', 'How much could I earn after switching?']}
      />

      {pick && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { track('action', 'first_pick_dismissed'); setPick(false) } }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pick-title">
            <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={() => { track('action', 'first_pick_dismissed'); setPick(false) }}><Icon name="x" /></button>
            <span className="sparkle"><Sparkle size="1.6rem" /></span>
            <h2 id="pick-title">Welcome, {name}! What would you like to check first?</h2>
            <p className="small muted">Each takes about a minute. You can check the others any time.</p>
            <div className="option-list">
              {TOOLS.map((t) => (
                <button key={t.id} type="button" className="option" onClick={() => choose(t.route, t.id)}>
                  <span className="option-icon"><Icon name={t.icon} /></span>
                  <span>{t.name}<span className="hint">{t.tagline}</span></span>
                </button>
              ))}
              <button type="button" className="option" onClick={() => choose('/dashboard/sessions', 'sessions')}>
                <span className="option-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name="calendar" /></span>
                <span>Talk to a mentor<span className="hint">Book a free career strategy session</span></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
