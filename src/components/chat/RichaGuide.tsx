'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Icon, type IconName } from '../Icon'
import { Avatar } from './Avatar'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'
import { BOT_NAME, GUIDE_TITLE } from '@/lib/counsellors'

export type GuideAction = { id: string; label: string; icon?: IconName; primary?: boolean }
/** The feedback form Richa shows under her message. */
export type RatingAsk = { counsellor: string; counsellorName: string; testTaken: boolean; threadId: string | null }
export type GuideLine = { text: string; actions?: GuideAction[]; autoCloseMs?: number; rating?: RatingAsk }
export type GuideHandle = {
  say: (line: GuideLine) => void
  /** Opens the feedback pop-up; resolves true when sent, false when skipped or closed. */
  askRating: (ask: RatingAsk, text: string) => Promise<boolean>
  close: () => void
}

const SEEN_KEY = 'lcn_richa_hi'
const NUDGED_KEY = 'lcn_richa_nudged'
const IDLE_MS = 120_000

const flag = (key: string) => { try { return window.sessionStorage.getItem(key) === '1' } catch { return false } }
const setFlag = (key: string) => { try { window.sessionStorage.setItem(key, '1') } catch { /* ignore */ } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Richa, the guide for the whole studio (like a guide in a game): always floating in the corner with her face,
 * she pops up with a typed message when there is something worth knowing (before you leave, after a long pause),
 * and helps with anything when tapped.
 */
export function RichaGuide({ first, help, nudge, onAction, ref }: {
  first: string
  /** What Richa offers when tapped. */
  help: () => GuideLine
  /** What Richa says before the learner leaves (null if there is nothing left worth doing). */
  nudge: () => GuideLine | null
  onAction: (id: string) => void
  ref?: React.Ref<GuideHandle>
}) {
  const [line, setLine] = useState<GuideLine | null>(null)
  const [shown, setShown] = useState('')
  const [typing, setTyping] = useState(false)
  const run = useRef(0)
  const closeTimer = useRef<number | null>(null)
  const ratingDone = useRef<((sent: boolean) => void) | null>(null)
  // Read at the moment of the nudge (the chat re-renders often; the listeners must not restart each time).
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge

  const settleRating = (sent: boolean) => { const r = ratingDone.current; ratingDone.current = null; r?.(sent) }
  const close = useCallback(() => {
    settleRating(false)
    run.current++
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setLine(null)
    setShown('')
    setTyping(false)
  }, [])

  /** Richa "types" the line: a short pause, then word by word, like the counsellors. */
  const say = useCallback(async (next: GuideLine) => {
    const id = ++run.current
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setLine(next)
    setShown('')
    setTyping(true)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    await sleep(reduced ? 100 : 700)
    const words = next.text.split(/(\s+)/)
    for (let n = 2; n <= words.length + 1 && !reduced; n += 2) {
      if (id !== run.current) return
      setShown(words.slice(0, n).join(''))
      await sleep(70 + Math.random() * 60 + (/[.!?]$/.test(words[n - 2] ?? '') ? 200 : 0))
    }
    if (id !== run.current) return
    setShown(next.text)
    setTyping(false)
    if (next.autoCloseMs) closeTimer.current = window.setTimeout(() => { if (id === run.current) close() }, next.autoCloseMs)
  }, [close])

  const askRating = useCallback((ask: RatingAsk, text: string) => new Promise<boolean>((resolve) => {
    settleRating(false)
    ratingDone.current = resolve
    track('action', 'rating_asked', { counsellor: ask.counsellor })
    void say({ text, rating: ask })
  }), [say])

  useImperativeHandle(ref, () => ({ say: (l) => { void say(l) }, askRating, close }), [say, askRating, close])

  useEffect(() => {
    if (!line) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [line, close])

  // First visit this session: a short hello, so learners know she's there.
  useEffect(() => {
    if (flag(SEEN_KEY)) return
    const t = window.setTimeout(() => {
      setFlag(SEEN_KEY)
      void say({ text: `Hi ${first}! I’m ${BOT_NAME}, your guide here. I’m always in the corner and in the menu, so tap me whenever you need help.` })
    }, 2500)
    return () => window.clearTimeout(t)
  }, [first, say])

  // Before they leave (the pointer heads for the tabs or address bar), or after a long pause: one nudge per visit.
  useEffect(() => {
    const fire = () => {
      if (flag(NUDGED_KEY)) return
      const n = nudgeRef.current()
      if (!n) return
      setFlag(NUDGED_KEY)
      void say(n)
    }
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0) fire() }
    let idle = window.setTimeout(fire, IDLE_MS)
    const active = () => { window.clearTimeout(idle); idle = window.setTimeout(fire, IDLE_MS) }
    document.addEventListener('mouseout', onOut)
    for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) window.addEventListener(ev, active, { passive: true })
    return () => {
      window.clearTimeout(idle)
      document.removeEventListener('mouseout', onOut)
      for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) window.removeEventListener(ev, active)
    }
  }, [say])

  return (
    <div className={`rg ${line ? 'rg-open' : ''}`}>
      {line && (
        <div className="rg-overlay" onClick={close}>
        <div className="rg-bubble" role="dialog" aria-modal="true" aria-label={`${BOT_NAME}, your guide`} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="rg-x" aria-label="Close" onClick={close}><Icon name="x" size="1.1rem" /></button>
          <div className="rg-top">
            <Avatar who="bot" size={60} online />
            <span className="rg-who"><b>{BOT_NAME}</b><span>{GUIDE_TITLE}</span></span>
          </div>
          <p className="rg-text" aria-live="polite">{shown}{typing && <i className="rg-caret" aria-hidden="true" />}</p>
          {!typing && line.rating && (
            <RatingForm
              ask={line.rating}
              onSent={(stars) => {
                const r = ratingDone.current
                ratingDone.current = null
                void say({ text: stars >= 4 ? `Thank you, ${first}! I’ll pass that on to ${line.rating!.counsellorName}.` : `Thank you for being honest, ${first}. We’ll use it to do better.`, autoCloseMs: 4500 })
                r?.(true)
              }}
              onSkip={close}
            />
          )}
          {!typing && !line.rating && !(line.actions && line.actions.length) && (
            <div className="rg-actions"><button type="button" className="rg-act primary" onClick={close}>Got it</button></div>
          )}
          {!typing && line.actions && line.actions.length > 0 && (
            <div className="rg-actions">
              {line.actions.map((a) => (
                <button key={a.id} type="button" className={`rg-act ${a.primary ? 'primary' : ''}`} onClick={() => onAction(a.id)}>
                  {a.icon && <Icon name={a.icon} size="0.9rem" />}{a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
      <button type="button" className="rg-face" aria-label={`Ask ${BOT_NAME}, your guide`} onClick={() => (line ? close() : void say(help()))}>
        <span className="rg-ring" aria-hidden="true" />
        <Avatar who="bot" size={68} online />
        <span className="rg-tag">Ask {BOT_NAME}</span>
      </button>
    </div>
  )
}

/** Stars for the counsellor, stars for the eligibility test (if taken), and an optional suggestion. */
function RatingForm({ ask, onSent, onSkip }: { ask: RatingAsk; onSent: (stars: number) => void; onSkip: () => void }) {
  const [rating, setRating] = useState(0)
  const [test, setTest] = useState(0)
  const [suggestion, setSuggestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function send() {
    setBusy(true)
    setError('')
    const r = await postJson('/api/reviews', { rating, testRating: test || undefined, suggestion: suggestion.trim() || undefined, threadId: ask.threadId })
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    track('action', 'rating_sent', { counsellor: ask.counsellor, rating, test })
    window.dispatchEvent(new CustomEvent('lcn:rated', { detail: r.data.rating }))
    onSent(rating)
  }
  return (
    <div className="rg-form">
      <Stars label={`Your counsellor, ${ask.counsellorName}`} value={rating} onChange={setRating} />
      {ask.testTaken && <Stars label="The eligibility test" value={test} onChange={setTest} />}
      <label className="rg-field">
        <span>Any suggestions for us? <small>(optional)</small></span>
        <textarea rows={2} maxLength={1000} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="What would make this better for you?" />
      </label>
      {error && <p className="rg-error">{error}</p>}
      <div className="rg-form-actions">
        <button type="button" className="rg-act primary" disabled={!rating || busy} onClick={send}>{busy ? 'Sending…' : 'Send feedback'}</button>
        <button type="button" className="rg-act" onClick={onSkip}>Not now</button>
      </div>
    </div>
  )
}

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="rg-stars-row">
      <span>{label}</span>
      <div className="rg-stars" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className={(hover || value) >= n ? 'on' : ''} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>★</button>
        ))}
      </div>
    </div>
  )
}
