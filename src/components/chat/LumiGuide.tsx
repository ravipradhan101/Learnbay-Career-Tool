'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Icon, type IconName } from '../Icon'
import { Avatar } from './Avatar'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'
import { BOT_NAME, GUIDE_TITLE } from '@/lib/counsellors'

export type GuideAction = { id: string; label: string; icon?: IconName; primary?: boolean }
/** The feedback form Lumi shows under her message. */
export type RatingAsk = { counsellor: string; counsellorName: string; testTaken: boolean; threadId: string | null }
export type GuideLine = { text: string; actions?: GuideAction[]; autoCloseMs?: number; rating?: RatingAsk }
export type GuideHandle = {
  say: (line: GuideLine) => void
  /** Shows the line and resolves with the action picked, or null if Lumi is closed (X, Esc, outside click). */
  choose: (line: GuideLine) => Promise<string | null>
  /** Opens the feedback pop-up; resolves true when sent, false when skipped or closed. */
  askRating: (ask: RatingAsk, text: string) => Promise<boolean>
  close: () => void
}

const SEEN_KEY = 'lcn_lumi_hi'
const NUDGED_KEY = 'lcn_lumi_nudged'
const IDLE_KEY = 'lcn_lumi_idle'
const IDLE_MS = 120_000

const flag = (key: string) => { try { return window.sessionStorage.getItem(key) === '1' } catch { return false } }
const setFlag = (key: string) => { try { window.sessionStorage.setItem(key, '1') } catch { /* ignore */ } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Lumi, the guide for the whole studio (like a guide in a game): always floating in the corner with her face,
 * she pops up with a typed message when there is something worth knowing (before you leave, after a long pause),
 * and helps with anything when tapped.
 */
export function LumiGuide({ first, who, hello, help, nudge, quiet, onAction, ref }: {
  first: string
  /** The learner (her hello and nudge happen once per visit per learner, even when several share a browser tab). */
  who: string
  /** Her first hello this visit (e.g. offering the tour to someone new). */
  hello?: () => GuideLine
  /** What Lumi offers when tapped. */
  help: () => GuideLine
  /** What Lumi says when the learner seems to be leaving, or has gone quiet (null if there is nothing left worth doing). */
  nudge: (why: 'back' | 'idle') => GuideLine | null
  /** True while Lumi must not nudge (e.g. during the tour, or before a new learner has answered the tour offer). */
  quiet?: () => boolean
  onAction: (id: string) => void
  ref?: React.Ref<GuideHandle>
}) {
  const [line, setLine] = useState<GuideLine | null>(null)
  const [shown, setShown] = useState('')
  const [typing, setTyping] = useState(false)
  const run = useRef(0)
  const closeTimer = useRef<number | null>(null)
  const ratingDone = useRef<((sent: boolean) => void) | null>(null)
  const choiceDone = useRef<((id: string | null) => void) | null>(null)
  // Read at the moment of the nudge (the chat re-renders often; the listeners must not restart each time).
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge
  const helloRef = useRef(hello)
  helloRef.current = hello
  const quietRef = useRef(quiet)
  quietRef.current = quiet
  const lineRef = useRef<GuideLine | null>(null)
  lineRef.current = line
  const onActionRef = useRef(onAction)
  onActionRef.current = onAction
  const chooseRef = useRef<(l: GuideLine) => Promise<string | null>>(async () => null)

  const settleRating = (sent: boolean) => { const r = ratingDone.current; ratingDone.current = null; r?.(sent) }
  const settleChoice = (id: string | null) => { const r = choiceDone.current; choiceDone.current = null; r?.(id) }
  const close = useCallback(() => {
    settleRating(false)
    settleChoice(null)
    run.current++
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setLine(null)
    setShown('')
    setTyping(false)
  }, [])

  /** Lumi "types" the line like the counsellors: typing dots for a moment, then the whole message at once. */
  const say = useCallback(async (next: GuideLine) => {
    const id = ++run.current
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setLine(next)
    setShown('')
    setTyping(true)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    await sleep(reduced ? 100 : 550 + Math.min(1300, next.text.length * 9))
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

  const choose = useCallback((next: GuideLine) => new Promise<string | null>((resolve) => {
    settleRating(false)
    settleChoice(null)
    choiceDone.current = resolve
    void say(next)
  }), [say])

  const act = (id: string) => {
    if (choiceDone.current) { const r = choiceDone.current; choiceDone.current = null; run.current++; setLine(null); setShown(''); r(id); return }
    onAction(id)
  }

  useImperativeHandle(ref, () => ({ say: (l) => { void say(l) }, choose, askRating, close }), [say, choose, askRating, close])
  chooseRef.current = choose

  useEffect(() => {
    if (!line) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [line, close])

  // First visit this session: a short hello, so learners know she's there.
  useEffect(() => {
    const seen = `${SEEN_KEY}:${who}`
    if (flag(seen)) return
    const t = window.setTimeout(() => {
      setFlag(seen)
      void say(helloRef.current?.() ?? { text: `Hi ${first}! I’m ${BOT_NAME}, your guide here. I’m always in the corner and in the menu, so tap me whenever you need help.` })
    }, 2500)
    return () => window.clearTimeout(t)
  }, [first, say, who])

  // After a long pause: "are you still there?" (once per visit, never over another message or the tour).
  useEffect(() => {
    const fire = () => {
      const key = `${IDLE_KEY}:${who}`
      if (flag(key) || lineRef.current || quietRef.current?.()) return
      const n = nudgeRef.current('idle')
      if (!n) return
      setFlag(key)
      void say(n)
    }
    let idle = window.setTimeout(fire, IDLE_MS)
    const active = () => { window.clearTimeout(idle); idle = window.setTimeout(fire, IDLE_MS) }
    for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) window.addEventListener(ev, active, { passive: true })
    return () => {
      window.clearTimeout(idle)
      for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const) window.removeEventListener(ev, active)
    }
  }, [say, who])

  // Leaving with the back button: one extra history entry catches it, and Lumi asks once before they go.
  // (Browsers don't allow a custom message when a tab is closed, so closing is left alone.)
  useEffect(() => {
    const armed = () => Boolean((window.history.state as { lumiGuard?: boolean } | null)?.lumiGuard)
    const arm = () => {
      const st = (window.history.state ?? {}) as Record<string, unknown>
      window.history.replaceState({ ...st, lumiBase: true, lumiGuard: undefined }, '')
      window.history.pushState({ ...st, lumiBase: undefined, lumiGuard: true }, '')
    }
    const t = window.setTimeout(() => { if (!armed()) arm() }, 1200)
    const onPop = (e: PopStateEvent) => {
      const st = e.state as { lumiBase?: boolean } | null
      if (!st?.lumiBase) return
      const key = `${NUDGED_KEY}:${who}`
      // Asked once already (or nothing worth saying): the back button simply works.
      const n = flag(key) || quietRef.current?.() ? null : nudgeRef.current('back')
      if (!n) { window.history.back(); return }
      setFlag(key)
      void chooseRef.current({ ...n, actions: [...(n.actions ?? []).filter((x) => x.id !== 'later'), { id: 'leave', label: 'Leave for now' }] }).then((id) => {
        if (id === 'leave') { window.history.back(); return }
        window.history.pushState({ ...(window.history.state ?? {}), lumiBase: undefined, lumiGuard: true }, '')
        if (id) onActionRef.current(id)
      })
    }
    window.addEventListener('popstate', onPop)
    return () => { window.clearTimeout(t); window.removeEventListener('popstate', onPop) }
  }, [who])

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
          <p className="rg-text" aria-live="polite">
            {typing ? <span className="rg-dots" aria-label={`${BOT_NAME} is typing`}><i /><i /><i /></span> : <span className="tc-pop">{shown}</span>}
          </p>
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
                <button key={a.id} type="button" className={`rg-act ${a.primary ? 'primary' : ''}`} onClick={() => act(a.id)}>
                  {a.icon && <Icon name={a.icon} size="0.9rem" />}{a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
      <button type="button" className="rg-face" data-tour="lumi" aria-label={`Ask ${BOT_NAME}, your guide`} onClick={() => (line ? close() : void say(help()))}>
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
