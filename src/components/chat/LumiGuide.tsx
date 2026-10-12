'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Icon, type IconName } from '../Icon'
import dynamic from 'next/dynamic'
import { Avatar, type BruceMood } from './Avatar'
import type { CodeLevel } from './BruceGames'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'
import { canSpeak, nextVoice, setVoiceOn, speak, stopSpeaking, voiceOn, VOICE_EVENT } from '@/lib/bruce-voice'
import { BOT_NAME, GUIDE_TITLE } from '@/lib/counsellors'

// The games load only when someone opens them (not with every studio page).
const BruceGames = dynamic(() => import('./BruceGames').then((m) => m.BruceGames), { ssr: false, loading: () => <p className="bg-intro">Setting up the games…</p> })

export type GuideAction = { id: string; label: string; icon?: IconName; primary?: boolean }
/** The feedback form Bruce shows under his message. */
export type RatingAsk = { counsellor: string; counsellorName: string; testTaken: boolean; threadId: string | null }
/** `asked`: the learner's own question, shown above Bruce's answer. `dance`: he dances while he says it. `game`: his brain games. */
export type GuideLine = { text: string; actions?: GuideAction[]; autoCloseMs?: number; rating?: RatingAsk; asked?: string; dance?: boolean; game?: boolean }
export type GuideHandle = {
  say: (line: GuideLine) => void
  /** Shows the line and resolves with the action picked, or null if Bruce is closed (X, Esc, outside click). */
  choose: (line: GuideLine) => Promise<string | null>
  /** Opens the feedback pop-up; resolves true when sent, false when skipped or closed. */
  askRating: (ask: RatingAsk, text: string) => Promise<boolean>
  close: () => void
  /** Opens his menu (help, plus his games and a dance). */
  menu: () => void
}

const SEEN_KEY = 'lcn_lumi_hi'
const NUDGED_KEY = 'lcn_lumi_nudged'

/** Where his answers can take the learner (from /api/guide). */
const GO_ACTION: Record<string, GuideAction> = {
  chat: { id: 'chat', label: 'Ask my counsellor', icon: 'message' },
  tour: { id: 'tour', label: 'Show me around', icon: 'target' },
  '/dashboard/skill-gap': { id: '/dashboard/skill-gap', label: 'Open my Skill Gap', icon: 'target' },
  '/dashboard/salary': { id: '/dashboard/salary', label: 'Open my Salary Benchmark', icon: 'rupee' },
  '/dashboard/roadmap': { id: '/dashboard/roadmap', label: 'Open my Roadmap', icon: 'route' },
  '/dashboard/eligibility': { id: '/dashboard/eligibility', label: 'Check my eligibility', icon: 'award' },
  '/dashboard/sessions': { id: '/dashboard/sessions', label: 'Book my free call', icon: 'calendar' },
  '/dashboard/masterclasses': { id: '/dashboard/masterclasses', label: 'See masterclasses', icon: 'play' },
  '/dashboard/profile': { id: '/dashboard/profile', label: 'Open my profile', icon: 'user' },
}

// Once per learner on this device (not once per visit): Bruce never repeats a hello or a "leaving already?".
const flag = (key: string) => { try { return window.localStorage.getItem(key) === '1' } catch { return false } }
const setFlag = (key: string) => { try { window.localStorage.setItem(key, '1') } catch { /* ignore */ } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Bruce, the guide for the whole studio (like a guide in a game): always floating in the corner with his face,
 * he pops up with a typed message when there is something worth knowing (before you leave, after a long pause),
 * and helps with anything when tapped.
 */
export function LumiGuide({ first, who, hello, help, nudge, quiet, busy, grow = 0, codeLevel = 'easy', onAction, ref }: {
  first: string
  /** Where his Python games start: starter (doesn't code), intermediate (a little), advanced (developers and IT). */
  codeLevel?: CodeLevel
  /** How much he has grown: one step per report or task the learner has finished (0-3 shown). */
  grow?: number
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
  const [talking, setTalking] = useState(false)
  const [voice, setVoice] = useState(false)
  const [question, setQuestion] = useState('')
  const [gameMood, setGameMood] = useState<BruceMood | null>(null)
  const run = useRef(0)
  const closeTimer = useRef<number | null>(null)
  // Set once the learner clicks, types or focuses anything in the pop-up: from then on it only closes when they close it.
  const engaged = useRef(false)
  const engage = () => { engaged.current = true; if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null } }
  const ratingDone = useRef<((sent: boolean) => void) | null>(null)
  const choiceDone = useRef<((id: string | null) => void) | null>(null)
  // Read at the moment of the nudge (the chat re-renders often; the listeners must not restart each time).
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge
  const helloRef = useRef(hello)
  const helpRef = useRef(help)
  helpRef.current = help
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
    stopSpeaking()
    setTalking(false)
    setLine(null)
    setShown('')
    setTyping(false)
  }, [])

  // His voice: off until the learner turns it on (remembered on this device, shared with his corner bubble).
  useEffect(() => {
    setVoice(voiceOn())
    const on = (e: Event) => setVoice(Boolean((e as CustomEvent<boolean>).detail))
    window.addEventListener(VOICE_EVENT, on)
    return () => window.removeEventListener(VOICE_EVENT, on)
  }, [])
  /** Tries the next good voice on this device and says hello in it. */
  const changeVoice = () => {
    const name = nextVoice()
    track('action', 'bruce_voice_change', { voice: name ?? undefined })
    speak(`Hi ${first}! This is my ${name ?? 'new'} voice. Do you like it?`, setTalking)
  }
  const toggleVoice = () => {
    const on = !voice
    setVoiceOn(on)
    track('action', 'bruce_voice', { on })
    if (on) speak(shown || `Yay! Now you can hear me, ${first}!`, setTalking)
  }

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
    speak(next.text, (t) => { if (id === run.current) setTalking(t) })
    engaged.current = false
    if (next.autoCloseMs) closeTimer.current = window.setTimeout(() => { if (id === run.current && !engaged.current) close() }, next.autoCloseMs)
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

  /** A typed question: Bruce answers in a few friendly lines (and out loud when his voice is on). */
  const askBruce = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (q.length < 2 || typing) return
    setQuestion('')
    settleRating(false)
    settleChoice(null)
    track('action', 'bruce_ask')
    const id = ++run.current
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    stopSpeaking()
    setLine({ text: '', asked: q })
    setShown('')
    setTyping(true)
    const r = await postJson('/api/guide', { question: q })
    if (id !== run.current) return
    const reply = r.ok ? (typeof r.data.reply === 'string' ? r.data.reply : '') : r.error
    const go = r.ok && typeof r.data.go === 'string' ? GO_ACTION[r.data.go] : undefined
    void say({ text: reply || `Oops, my leaves got tangled, ${first}! Try asking me again in a moment.`, asked: q, actions: go ? [{ ...go, primary: true }] : undefined })
  }

  /** His brain games, inside his pop-up. */
  const startGames = () => {
    settleRating(false)
    settleChoice(null)
    run.current++
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setGameMood('excited')
    setLine({ text: '', game: true })
    setShown('')
    setTyping(false)
    speak(`Game time, ${first}! Pick one and I’ll explain every answer.`, setTalking)
  }
  const gameReact = (mood: BruceMood, said: string) => {
    setGameMood(mood)
    speak(said, setTalking)
  }

  const act = (id: string) => {
    if (id === 'bruce-games') { startGames(); return }
    if (id === 'bruce-dance') { track('action', 'bruce_dance'); void say({ text: DANCES[Math.floor(Math.random() * DANCES.length)], dance: true, autoCloseMs: 6000 }); return }
    if (choiceDone.current) { const r = choiceDone.current; choiceDone.current = null; run.current++; setLine(null); setShown(''); r(id); return }
    onAction(id)
  }

  useImperativeHandle(ref, () => ({ say: (l) => { void say(l) }, choose, askRating, close, menu: () => { void say(withFun(helpRef.current())) } }), [say, choose, askRating, close])
  chooseRef.current = choose

  useEffect(() => {
    if (!line) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [line, close])

  /** His menu always ends with a little fun. */
  const withFun = (l: GuideLine): GuideLine => ({ ...l, actions: [...(l.actions ?? []), { id: 'bruce-games', label: 'Play a quick brain game', icon: 'bulb' }, { id: 'bruce-dance', label: `Make ${BOT_NAME} dance`, icon: 'music' }] })

  // First visit ever (per learner, on this device): a short hello, so learners know he’s there. It waits until the counsellor has finished
  // their opening (never a pop-up over a half-typed message), and gives up waiting after about 30 seconds.
  const busyRef = useRef(busy)
  busyRef.current = busy
  useEffect(() => {
    const seen = `${SEEN_KEY}:${who}`
    if (flag(seen)) return
    let tries = 0
    let t = 0
    const attempt = () => {
      // Never while the learner is typing (in the chat or anywhere else on the page).
      const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
      const typing = Boolean(el && /^(TEXTAREA|INPUT)$/.test(el.tagName) && el.value)
      if ((busyRef.current?.() || lineRef.current || typing) && tries++ < 28) { t = window.setTimeout(attempt, 1000); return }
      if (typing) return
      setFlag(seen)
      // They already opened him (a game, an answer, his menu): they know he's here, and that panel is never replaced.
      if (lineRef.current) return
      void say(helloRef.current?.() ?? { text: `Hi ${first}! I’m ${BOT_NAME}, your guide here. I’m always in the corner and in the menu, so tap me whenever you need help.` })
    }
    t = window.setTimeout(attempt, 2500)
    return () => window.clearTimeout(t)
  }, [first, say, who])

  // (No "are you still there?" after a pause: Bruce never pops up on his own beyond the first hello.)

  // Leaving with the back button: one extra history entry catches it, and Bruce asks once (ever, per learner) before
  // they go; after that the back button simply works.
  // (Browsers don't allow a custom message when a tab is closed, so closing is left alone.)
  useEffect(() => {
    // Already asked once: no extra history entry at all, so Back is the browser's own Back.
    if (flag(`${NUDGED_KEY}:${who}`)) return
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
        <div className={`rg-bubble${line.game ? ' rg-game' : ''}`} role="dialog" aria-modal="true" aria-label={`${BOT_NAME}, your guide`} onClick={(e) => e.stopPropagation()}
          onPointerDown={engage} onFocusCapture={engage} onKeyDown={engage} onInputCapture={engage}>
          <button type="button" className="rg-x" aria-label="Close" onClick={close}><Icon name="x" size="1.1rem" /></button>
          {canSpeak() && (
            <div className="rg-voice-wrap">
              {voice && (
                <button type="button" className="rg-voice-change" onClick={changeVoice} title="Try another voice" aria-label={`Try another voice for ${BOT_NAME}`}>
                  <Icon name="refresh" size="0.95rem" />
                </button>
              )}
              <button type="button" className={`rg-voice${voice ? ' on' : ''}`} aria-pressed={voice} onClick={toggleVoice}
                title={voice ? `Mute ${BOT_NAME}` : `Hear ${BOT_NAME}’s voice`}>
                <Icon name={voice ? 'volume' : 'mute'} size="1rem" /><span>{voice ? 'Voice on' : 'Voice off'}</span>
              </button>
            </div>
          )}
          <div className="rg-top">
            <Avatar who="bot" size={line.game ? 46 : 60} online grow={grow} mood={line.game ? (gameMood === 'dance' || !talking ? gameMood ?? 'present' : 'talk') : typing ? 'thinking' : line.dance ? 'dance' : talking ? 'talk' : line.rating ? 'innocent' : line.actions?.length ? 'present' : 'wave'} />
            <span className="rg-who"><b>{BOT_NAME}</b><span>{GUIDE_TITLE}</span></span>
          </div>
          {line.game && <BruceGames who={who} first={first} level={codeLevel} onReact={gameReact} onExit={() => { setGameMood(null); void say(withFun(help())) }} />}
          {!line.game && line.asked && <p className="rg-asked"><span>You asked</span>{line.asked}</p>}
          {!line.game && <p className="rg-text" aria-live="polite">
            {typing ? <span className="rg-dots" aria-label={`${BOT_NAME} is typing`}><i /><i /><i /></span> : <span className="tc-pop">{shown}</span>}
          </p>}
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
          {!typing && !line.game && !line.rating && !(line.actions && line.actions.length) && (
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
          {!line.rating && !line.game && (
            <form className="rg-ask" onSubmit={askBruce}>
              <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder={`Ask ${BOT_NAME} anything…`} aria-label={`Ask ${BOT_NAME} a question`} enterKeyHint="send" />
              <button type="submit" aria-label="Send" disabled={question.trim().length < 2 || typing}><Icon name="send" size="0.95rem" /></button>
            </form>
          )}
        </div>
        </div>
      )}
      <BruceFace open={Boolean(line)} grow={grow} first={first} onOpen={() => (line ? close() : void say(withFun(help())))} />
    </div>
  )
}

const GIGGLES = [
  'Hehe, that tickles! My leaves are very ticklish.',
  'Hihi! Stop it, I’m giggling so much my roots are shaking!',
  'Hehehe, okay okay, you win! Tickle champion!',
  'Bwahaha! Careful, I might drop a leaf!',
]
const WAKE_UPS = [
  'I’m awake! I wasn’t sleeping… just resting my eyes.',
  'Huh? I’m up, I’m up! I was doing some photosynthesis, very important work.',
  'Oh hi! I was dreaming about growing a whole forest of skills with you.',
]
const DANCES = ['Watch my moves! A little sapling shuffle, just for you!', 'Leaf to the left, leaf to the right… I’ve got the groove!', 'Dancing for your progress! Every step counts, and so does every wiggle.']
type Bubble = { text: string; ask?: boolean }

/**
 * Bruce in his corner. He sits there with his eyes open, and now and then dozes off. He never starts small talk:
 * he speaks when the learner taps, asks or plays, and when they finish a step (he grows). One tap: he asks what you need.
 * Several quick taps: he giggles. Drag and throw him: he flies, falls, says "Ouch!", then offers help; with no answer
 * in 5 seconds he goes back to his place. Tap him while he dozes: "I'm awake! I wasn't sleeping…", then he helps.
 */
function BruceFace({ open, onOpen, grow, first }: { open: boolean; onOpen: () => void; grow: number; first: string }) {
  const [mood, setMood] = useState<BruceMood>('idle')
  const [talking, setTalking] = useState(false)
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [offset, setOffset] = useState<{ x: number; y: number; r?: number } | null>(null)
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
    speak(text, setTalking)
    // When he speaks out loud, the bubble stays until he has finished the sentence.
    const wait = voiceOn() ? Math.max(ms, 900 + text.length * 70) : ms
    if (ms) later(() => { setBubble(null); then?.() }, wait)
  }

  // He grows with the learner: a new leaf, a taller sprout, then a flower, with a happy dance (not on page load).
  const grown = useRef<number | null>(null)
  const stage = Math.min(3, Math.max(0, grow))
  useEffect(() => {
    const before = grown.current
    grown.current = stage
    if (before === null || stage <= before || open || flying.current) return
    track('action', 'bruce_grew', { stage })
    // A silent happy dance: he never talks unless the learner calls him.
    later(() => { setMood('dance'); later(() => setMood('idle'), 4200) }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  /** One tap: help (waking him first if he dozed off, or after a fall). */
  const primary = () => {
    track('action', 'bruce_tap', { mood: moodRef.current })
    if (moodRef.current === 'sleep') {
      say(WAKE_UPS[Math.floor(Math.random() * WAKE_UPS.length)], 'excited', 2400, () => { setMood('idle'); onOpen() })
      return
    }
    if (awayRef.current) { goHome(); later(onOpen, 760); return }
    setMood('idle')
    onOpen()
  }
  const giggle = () => {
    track('action', 'bruce_giggle')
    clearTimers()
    say(GIGGLES[Math.floor(Math.random() * GIGGLES.length)], 'playful', 2200, () => setMood(awayRef.current ? 'present' : 'idle'))
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
    say('Ouch! That hurt my butt! Good thing trees are tough.', 'ouch', 2000, () => {
      setMood('present')
      setBubble({ text: 'Anyway… can I help you with something?', ask: true })
      speak('Anyway, can I help you with something?', setTalking)
      later(() => say('I’m going back to my place. If you need me, just tap me!', 'wave', 2200, goHome), 5000)
    })
  }

  /**
   * The throw: real-feeling physics. Gravity pulls him down, he leans the way he flies, each bounce on the floor is
   * lower than the last (with a little squash as he hits it), then he slides to a stop and stands up straight.
   */
  const fly = (x0: number, y0: number, vx0: number, vy0: number, homeX: number, homeY: number) => {
    const el = wrap.current
    if (!el) return
    flying.current = true
    const w = el.offsetWidth
    const h = el.offsetHeight
    let x = x0, y = y0, vx = Math.max(-38, Math.min(38, vx0)), vy = Math.max(-38, Math.min(38, vy0))
    let lean = 0
    let bounces = 0
    let grounded = false
    const floor = window.innerHeight - h - 6
    // Animation frames pause in a hidden tab; a timer keeps the fall going so he always lands.
    const next = (f: () => void) => (document.hidden ? window.setTimeout(f, 16) : requestAnimationFrame(f))
    // One physics tick per 1/60 s of real time, so the fall takes the same time on a slow device or a throttled tab.
    let last = performance.now()
    const tick = (): boolean => {
      if (!grounded) {
        vy += 0.95
        vx *= 0.994
      }
      x += vx
      y += vy
      if (x < 6) { x = 6; vx = -vx * 0.55 }
      if (x > window.innerWidth - w - 6) { x = window.innerWidth - w - 6; vx = -vx * 0.55 }
      if (y < 6) { y = 6; vy = -vy * 0.5 }
      if (!grounded && y >= floor) {
        y = floor
        bounces++
        // Each bounce keeps about half its height; once it's tiny (or after 6), he stays down and slides.
        if (Math.abs(vy) < 3.2 || bounces > 6) { vy = 0; grounded = true }
        else { vy = -vy * 0.52; vx *= 0.82 }
        squash()
      }
      if (grounded) {
        y = floor
        vx *= 0.86
        lean *= 0.78
        return Math.abs(vx) < 0.25 && Math.abs(lean) < 0.6
      }
      // He leans into the direction he's flying (never a full spin).
      lean += (Math.max(-28, Math.min(28, vx * 2.2)) - lean) * 0.2
      return false
    }
    const step = () => {
      const now = performance.now()
      const ticks = Math.max(1, Math.min(240, Math.round((now - last) / (1000 / 60))))
      last = now
      for (let i = 0; i < ticks; i++) {
        if (tick()) {
          setOffset({ x: x - homeX, y: y - homeY, r: 0 })
          flying.current = false
          landed()
          return
        }
      }
      setOffset({ x: x - homeX, y: y - homeY, r: lean })
      next(step)
    }
    next(step)
  }
  /** A quick squash as he hits the floor (restarts the animation on every bounce). */
  const squash = () => {
    const face = wrap.current?.querySelector('.rg-face')
    if (!face) return
    face.classList.remove('squash')
    void (face as HTMLElement).offsetWidth
    face.classList.add('squash')
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

  const style = offset ? { transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.r ?? 0}deg)`, transition: returning ? 'transform 0.7s cubic-bezier(.3,1.3,.5,1)' : 'none' } : undefined
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
        <span className="rg-glow" aria-hidden="true" />
        <span className="rg-pad" aria-hidden="true" />
        <Avatar who="bot" size={76} bare grow={stage} mood={talking && mood !== 'dance' && mood !== 'sleep' ? 'talk' : mood} />
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
