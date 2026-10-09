'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Icon, type IconName } from '../Icon'
import { Avatar, type BruceMood } from './Avatar'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'
import { BOT_NAME, GUIDE_TITLE } from '@/lib/counsellors'

export type GuideAction = { id: string; label: string; icon?: IconName; primary?: boolean }
/** The feedback form Bruce shows under his message. */
export type RatingAsk = { counsellor: string; counsellorName: string; testTaken: boolean; threadId: string | null }
export type GuideLine = { text: string; actions?: GuideAction[]; autoCloseMs?: number; rating?: RatingAsk }
export type GuideHandle = {
  say: (line: GuideLine) => void
  /** Shows the line and resolves with the action picked, or null if Bruce is closed (X, Esc, outside click). */
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
 * Bruce, the guide for the whole studio (like a guide in a game): always floating in the corner with his face,
 * he pops up with a typed message when there is something worth knowing (before you leave, after a long pause),
 * and helps with anything when tapped.
 */
export function LumiGuide({ first, who, hello, help, nudge, quiet, busy, onAction, ref }: {
  first: string
  /** The learner (his hello and nudge happen once per visit per learner, even when several share a browser tab). */
  who: string
  /** His first hello this visit (e.g. offering the tour to someone new). */
  hello?: () => GuideLine
  /** What Bruce offers when tapped. */
  help: () => GuideLine
  /** What Bruce says when the learner seems to be leaving, or has gone quiet (null if there is nothing left worth doing). */
  nudge: (why: 'back' | 'idle') => GuideLine | null
  /** True while Bruce must not nudge (e.g. during the tour, or before a new learner has answered the tour offer). */
  quiet?: () => boolean
  /** True while the counsellor is still typing or working: his hello waits until they have finished. */
  busy?: () => boolean
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

  /** Bruce "types" the line like the counsellors: typing dots for a moment, then the whole message at once. */
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

  // First visit this session: a short hello, so learners know he’s there. It waits until the counsellor has finished
  // their opening (never a pop-up over a half-typed message), and gives up waiting after about 30 seconds.
  const busyRef = useRef(busy)
  busyRef.current = busy
  useEffect(() => {
    const seen = `${SEEN_KEY}:${who}`
    if (flag(seen)) return
    let tries = 0
    let t = 0
    const attempt = () => {
      if ((busyRef.current?.() || lineRef.current) && tries++ < 28) { t = window.setTimeout(attempt, 1000); return }
      setFlag(seen)
      void say(helloRef.current?.() ?? { text: `Hi ${first}! I’m ${BOT_NAME}, your guide here. I’m always in the corner and in the menu, so tap me whenever you need help.` })
    }
    t = window.setTimeout(attempt, 2500)
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

  // Leaving with the back button: one extra history entry catches it, and Bruce asks once before they go.
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
            <Avatar who="bot" size={60} online mood={typing ? 'thinking' : line.rating ? 'innocent' : line.actions?.length ? 'present' : 'wave'} />
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
      <BruceFace open={Boolean(line)} onOpen={() => (line ? close() : void say(help()))} />
    </div>
  )
}

const GIGGLES = ['Hehe, that tickles!', 'Hihi! Stop it, I’m ticklish!', 'Hehehe, okay okay, I’m awake!']
const WAKE_UPS = ['I’m awake! I wasn’t sleeping… just resting my eyes.', 'Huh? I’m up, I’m up! I was thinking, not sleeping.']
type Bubble = { text: string; ask?: boolean }

/**
 * Bruce in his corner. He sits there with his eyes open, and now and then dozes off. One tap: he asks what you need.
 * Several quick taps: he giggles. Drag and throw him: he flies, falls, says "Ouch!", then offers help; with no answer
 * in 5 seconds he goes back to his place. Tap him while he dozes: "I'm awake! I wasn't sleeping…", then he helps.
 */
function BruceFace({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const [mood, setMood] = useState<BruceMood>('idle')
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const [returning, setReturning] = useState(false)
  // On the left half of the screen his bubble opens to his right, so it never runs off the edge.
  const [sayRight, setSayRight] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const drag = useRef<{ startX: number; startY: number; grabX: number; grabY: number; homeX: number; homeY: number; moved: boolean; vx: number; vy: number; lastX: number; lastY: number; lastT: number } | null>(null)
  const clicks = useRef(0)
  const clickTimer = useRef<number | null>(null)
  const flying = useRef(false)
  const awayRef = useRef(false)
  const moodRef = useRef(mood)
  moodRef.current = mood

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  useEffect(() => () => clearTimers(), [])

  const goHome = useCallback(() => {
    clearTimers()
    setBubble(null)
    setReturning(true)
    setOffset({ x: 0, y: 0 })
    later(() => { setReturning(false); setOffset(null); setSayRight(false); awayRef.current = false; setMood('idle') }, 750)
  }, [])

  // Dozing: after a quiet while in his corner, his eyes close (any interaction anywhere keeps him awake).
  useEffect(() => {
    let t = 0
    const arm = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => { if (!open && !awayRef.current && !flying.current && moodRef.current === 'idle') setMood('sleep') }, 45_000 + Math.random() * 30_000)
    }
    arm()
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    for (const ev of events) window.addEventListener(ev, arm, { passive: true })
    return () => { window.clearTimeout(t); for (const ev of events) window.removeEventListener(ev, arm) }
  }, [open])
  // While his message box is open he is attentive, not asleep.
  useEffect(() => { if (open && moodRef.current === 'sleep') setMood('idle') }, [open])

  const say = (text: string, m: BruceMood, ms: number, then?: () => void) => {
    setMood(m)
    setBubble({ text })
    if (ms) later(() => { setBubble(null); then?.() }, ms)
  }

  /** One tap: help (waking him first if he dozed off, or after a fall). */
  const primary = () => {
    track('action', 'bruce_tap', { mood: moodRef.current })
    if (moodRef.current === 'sleep') {
      say(WAKE_UPS[Math.floor(Math.random() * WAKE_UPS.length)], 'excited', 1800, () => { setMood('idle'); onOpen() })
      return
    }
    if (awayRef.current) { goHome(); later(onOpen, 760); return }
    setMood('idle')
    onOpen()
  }
  const giggle = () => {
    track('action', 'bruce_giggle')
    clearTimers()
    say(GIGGLES[Math.floor(Math.random() * GIGGLES.length)], 'playful', 1700, () => setMood(awayRef.current ? 'present' : 'idle'))
  }
  const registerClick = () => {
    clicks.current++
    if (clickTimer.current) window.clearTimeout(clickTimer.current)
    clickTimer.current = window.setTimeout(() => {
      const n = clicks.current
      clicks.current = 0
      if (n >= 3) giggle()
      else primary()
    }, 300)
  }

  /** After a throw: "Ouch!", then back to being the guide; no answer in 5 seconds and he goes home. */
  const landed = () => {
    track('action', 'bruce_thrown')
    awayRef.current = true
    const r = wrap.current?.getBoundingClientRect()
    setSayRight(Boolean(r && r.left + r.width / 2 < window.innerWidth / 2))
    say('Ouch! That hurt my butt!', 'ouch', 1700, () => {
      setMood('present')
      setBubble({ text: 'Anyway… can I help you with something?', ask: true })
      later(() => say('I’m going back to my place. If you need me, wake me up!', 'wave', 2200, goHome), 5000)
    })
  }

  const fly = (x0: number, y0: number, vx0: number, vy0: number, homeX: number, homeY: number) => {
    const el = wrap.current
    if (!el) return
    flying.current = true
    const w = el.offsetWidth
    const h = el.offsetHeight
    let x = x0, y = y0, vx = Math.max(-40, Math.min(40, vx0)), vy = Math.max(-40, Math.min(40, vy0))
    let bounces = 0
    const floor = window.innerHeight - h - 8
    // Animation frames pause in a hidden tab; a timer keeps the fall going so he always lands.
    const next = (f: () => void) => (document.hidden ? window.setTimeout(f, 16) : requestAnimationFrame(f))
    // One physics tick per 1/60 s of real time, so the fall takes the same time on a slow device or a throttled tab.
    let last = performance.now()
    const tick = (): boolean => {
      vy += 1.1
      x += vx
      y += vy
      if (x < 8) { x = 8; vx = -vx * 0.6 }
      if (x > window.innerWidth - w - 8) { x = window.innerWidth - w - 8; vx = -vx * 0.6 }
      if (y < 8) { y = 8; vy = -vy * 0.5 }
      if (y >= floor) {
        y = floor
        vy = -vy * 0.38
        vx *= 0.75
        bounces++
        if (Math.abs(vy) < 2 || bounces > 3) return true
      }
      return false
    }
    const step = () => {
      const now = performance.now()
      const ticks = Math.max(1, Math.min(240, Math.round((now - last) / (1000 / 60))))
      last = now
      for (let i = 0; i < ticks; i++) {
        if (tick()) {
          setOffset({ x: x - homeX, y: y - homeY })
          flying.current = false
          landed()
          return
        }
      }
      setOffset({ x: x - homeX, y: y - homeY })
      next(step)
    }
    next(step)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (flying.current || open || e.button !== 0) return
    const el = wrap.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cur = offset ?? { x: 0, y: 0 }
    drag.current = { startX: e.clientX, startY: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top, homeX: r.left - cur.x, homeY: r.top - cur.y, moved: false, vx: 0, vy: 0, lastX: e.clientX, lastY: e.clientY, lastT: performance.now() }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* some browsers refuse capture; dragging still works */ }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 7) return
    if (!d.moved) { d.moved = true; clearTimers(); setBubble(null); setMood('excited'); awayRef.current = true }
    const now = performance.now()
    const dt = Math.max(8, now - d.lastT)
    d.vx = ((e.clientX - d.lastX) / dt) * 16
    d.vy = ((e.clientY - d.lastY) / dt) * 16
    d.lastX = e.clientX
    d.lastY = e.clientY
    d.lastT = now
    setOffset({ x: e.clientX - d.grabX - d.homeX, y: e.clientY - d.grabY - d.homeY })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) { registerClick(); return }
    fly(e.clientX - d.grabX, e.clientY - d.grabY, d.vx, d.vy, d.homeX, d.homeY)
  }

  const style = offset ? { transform: `translate(${offset.x}px, ${offset.y}px)`, transition: returning ? 'transform 0.7s cubic-bezier(.3,1.3,.5,1)' : 'none' } : undefined
  return (
    <div ref={wrap} className={`rg-bruce${offset ? ' free' : ''}`} style={style}>
      {bubble && (
        <div className={`rg-say${sayRight ? ' right' : ''}`} role="status" aria-live="polite">
          <span>{bubble.text}</span>
          {bubble.ask && (
            <span className="rg-say-acts">
              <button type="button" onClick={() => { clearTimers(); setBubble(null); goHome(); later(onOpen, 760) }}>Yes, please</button>
              <button type="button" onClick={() => { clearTimers(); say('Okay! I’ll be in my corner.', 'wave', 1400, goHome) }}>No, thanks</button>
            </span>
          )}
        </div>
      )}
      <button type="button" className="rg-face" data-tour="lumi" aria-label={`Ask ${BOT_NAME}, your guide`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null }}
        onClick={(e) => { if (e.detail === 0) primary() }}>
        <span className="rg-ring" aria-hidden="true" />
        <Avatar who="bot" size={68} online mood={mood} />
        <span className="rg-tag">{mood === 'sleep' ? `Wake ${BOT_NAME}` : `Ask ${BOT_NAME}`}</span>
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
