'use client'

// The conversation engine behind the chat (Richa the guide, then the counsellor). Flows are plain async scripts ("say this, then ask that"):
//   await bot.say('What do you do today?'); const role = await bot.choose(ROLES)
// Starting another flow (e.g. a click in the left panel) cancels the running one cleanly.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IconName } from '../Icon'
import type { UspId } from '@/config/usps'
import { clearCachedChats, getJson, postJson, sessionGet, sessionSet } from '@/lib/client'
import type { TestState } from '@/lib/eligibility'
import type { Answers } from '@/lib/questions'
import type { ReportCard } from '@/lib/report-card'
import type { ToolId } from '@/lib/tools-meta'

export type Choice = { id: string; label: string; hint?: string; icon?: IconName }
export type EligInProgress = Extract<TestState, { status: 'in_progress' }>
export type EligCompleted = Extract<TestState, { status: 'completed' }>

export type Card =
  | { type: 'readiness' }
  | { type: 'preparing'; steps: string[] }
  | { type: 'contact'; answers: Answers; prefill: { name: string; email: string; phoneCountry: string; phone: string } | null }
  | { type: 'otp'; email: string; existing: boolean }
  | { type: 'intro'; tool: ToolId }
  | { type: 'generating'; tool: ToolId }
  | { type: 'report'; card: ReportCard }
  | { type: 'elig-intro'; questions: number; seconds: number; attemptsLeft: number; area: string }
  | { type: 'elig-run'; state: EligInProgress }
  | { type: 'elig-result'; result: EligCompleted }
  | { type: 'usp'; ids: UspId[]; lead?: string }
  | { type: 'booking' }
  | { type: 'masterclass'; interest: string; label: string }
  | { type: 'call'; source: 'button' | 'chat'; phone: string; by: string }
  | { type: 'call-guest' }
  | { type: 'login' }
  | { type: 'matching'; track: string }
  | { type: 'counsellor'; id: string; track: string }
  | { type: 'skill-levels'; skills: { id: string; label: string }[] }
  | { type: 'program'; interest: string }
  | { type: 'proof' }
  | { type: 'projects'; interest: string }
  | { type: 'career-path'; interest: string; from?: string }
  | { type: 'why'; interest: string }
  | { type: 'curriculum'; interest: string }
  | { type: 'refund' }

type Base = { id: string; at: number }
export type Item = Base & (
  | { kind: 'bot'; text: string; action?: { href: string; label: string } | null; by?: string }
  | { kind: 'event'; text: string; tone: 'join' | 'leave' | 'info' }
  | { kind: 'user'; text: string }
  | { kind: 'divider'; text: string }
  | { kind: 'card'; card: Card; live?: boolean; by?: string }
  | { kind: 'typing'; by?: string }
)

export type Prompt = { choices: Choice[]; style: 'rows' | 'chips'; multi?: boolean; doneLabel?: string; question?: string }
/** What the learner typed while options were showing, understood as one of them (`typed` = don't echo it again). */
type Picked = Choice & { typed?: boolean }
/** `label` is shown above the box so it's obvious the answer is typed there (e.g. "Your first name"). */
export type Asking = { placeholder: string; label?: string; inputMode?: 'text' | 'email' | 'numeric'; maxLength?: number }

/** Cards worth keeping when the chat is reopened; interactive ones (forms, the running test) are not. */
const PERSIST = new Set<Card['type']>(['readiness', 'report', 'elig-result', 'usp', 'intro', 'counsellor', 'program', 'proof', 'projects', 'career-path', 'why', 'curriculum', 'refund'])
const MAX_SAVED = 70

export const CANCELLED = Symbol('cancelled')

export type AiResult = {
  choice?: string; goNow?: boolean; action?: { href: string; label: string } | null; show?: string
  /** Counselling: a probing question with the learner's likely answers, and a better-fitting track (if any). */
  followUp?: { question: string; options: string[] }; suggestTrack?: string
}
export type AiOpts = {
  message?: string; intent?: 'welcome' | 'report' | 'need' | 'analysis'; context: string
  pending?: { question: string; options: { id: string; label: string }[] }
  counsel?: { was: string; round: number }
}
/** What a side conversation can do with the question it set aside. */
export type Detour = { question: string | null; restore: () => boolean }

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim()

/**
 * Understands typed text as the options on screen when it clearly is: "2", "software engineer", "python and sql".
 * Anything less clear goes to the counsellor, who reads it in context.
 */
export function matchTyped(text: string, prompt: Prompt): Choice | Choice[] | null {
  const t = norm(text)
  if (!t) return null
  const choices = prompt.choices
  const n = /^\d{1,2}$/.test(t) ? Number(t) : NaN
  if (!prompt.multi && n >= 1 && n <= choices.length) return choices[n - 1]
  const parts = (c: Choice) => [c.label, ...c.label.split(/\s*[/·,(]\s*|\s+or\s+/i)].map(norm).filter((p) => p.length >= 2)
  if (prompt.multi) {
    const hits = choices.filter((c) => parts(c).some((p) => new RegExp(`(^| )${p.replace(/[+#]/g, '\\$&')}( |$)`).test(t)))
    return hits.length ? hits : null
  }
  const exact = choices.find((c) => norm(c.label) === t || norm(c.id) === t)
  if (exact) return exact
  const inText = choices.filter((c) => norm(c.label).length >= 3 && t.includes(norm(c.label)))
  if (inText.length === 1) return inText[0]
  if (t.length >= 4 && t.split(' ').length <= 4) {
    const inLabel = choices.filter((c) => norm(c.label).includes(t))
    if (inLabel.length === 1) return inLabel[0]
  }
  return null
}
export const isCancelled = (e: unknown) => e === CANCELLED

let seq = 0
const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Pending = { kind: 'choose' | 'ask' | 'live'; cardId?: string; resolve: (v: unknown) => void; reject: (e: unknown) => void }

export type Bot = {
  /** True if a message in this chat already matches (e.g. the counsellor has already introduced themselves). */
  hasSaid: (test: (text: string) => boolean) => boolean
  event: (text: string, tone?: 'join' | 'leave' | 'info') => void
  speakAs: (id: string) => void
  say: (text: string, opts?: { action?: { href: string; label: string } | null; quick?: boolean }) => Promise<void>
  divider: (text: string) => void
  card: (card: Card) => string
  live: <T>(card: Card) => Promise<T>
  update: (id: string, card: Card) => void
  remove: (id: string) => void
  choose: (choices: Choice[], opts?: { style?: 'rows' | 'chips'; echo?: boolean }) => Promise<Choice>
  chooseMany: (choices: Choice[], doneLabel?: string) => Promise<Choice[]>
  ask: (asking: Asking, opts?: { echo?: (v: string) => string }) => Promise<string>
  ai: (opts: AiOpts) => Promise<AiResult>
  wait: (ms: number) => Promise<void>
  alive: () => void
}

export function useChat({ storageKey, signedIn, speaker, threadId = null }: { storageKey: string | null; signedIn: boolean; speaker: string; threadId?: string | null }) {
  const [items, setItems] = useState<Item[]>([])
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [asking, setAsking] = useState<Asking | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [thinking, setThinking] = useState(false)
  // Which chat has finished loading. `restored` is only true for the chat being shown right now, so a flow never
  // starts before its saved messages arrive (which would then overwrite what the flow just said).
  const loadKey = threadId ?? storageKey ?? '__none__'
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const restored = loadedKey === loadKey
  const token = useRef(0)
  const pending = useRef<Pending[]>([])
  // A side conversation (the learner asked something mid-question): the question it set aside, and where its own waits start.
  const detourToken = useRef(0)
  const detourMark = useRef<number | null>(null)
  const savedPrompt = useRef<Prompt | null>(null)
  const promptRef = useRef<Prompt | null>(null)
  promptRef.current = prompt
  const flowActive = useRef(0)
  const conversationId = useRef<string | null>(null)
  const reduced = useRef(false)
  // Who is talking now (Richa or the allocated counsellor); every message remembers who said it.
  const [who, setWho] = useState(speaker)
  const whoRef = useRef(speaker)
  whoRef.current = who
  const [callOffer, setCallOffer] = useState(false)
  const itemsRef = useRef<Item[]>([])
  itemsRef.current = items

  // ---------- persistence ----------
  // Signed in: each chat is a saved thread on the server (so it is there on any device).
  // Before sign-up: the conversation is kept in this browser only.
  const clean = (list: Item[]) => list.filter((i) => i.kind !== 'typing' && !(i.kind === 'card' && (i.live || !PERSIST.has(i.card.type)))).slice(-MAX_SAVED)
  useEffect(() => {
    reduced.current = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    clearCachedChats()
    let cancelled = false
    setLoadedKey(null)
    if (threadId) {
      conversationId.current = threadId
      getJson(`/api/chats/${threadId}`).then((r) => {
        if (cancelled) return
        const saved = r.ok ? ((r.data.thread as { items?: Item[] } | undefined)?.items ?? []) : []
        setItems(saved.filter((i) => i.kind !== 'typing' && !(i.kind === 'card' && i.live)))
        setLoadedKey(threadId)
      })
    } else {
      if (storageKey) {
        const saved = sessionGet<{ items: Item[]; conversationId?: string | null }>(storageKey)
        setItems(saved?.items?.length ? saved.items.filter((i) => i.kind !== 'typing' && !(i.kind === 'card' && i.live)) : [])
        conversationId.current = saved?.conversationId ?? null
      }
      setLoadedKey(storageKey ?? '__none__')
    }
    return () => { cancelled = true }
  }, [storageKey, threadId])

  useEffect(() => {
    if (!restored) return
    if (threadId) {
      const keep = clean(items)
      if (!keep.length) return
      const firstUser = keep.find((i) => i.kind === 'user')
      const firstTopic = keep.find((i) => i.kind === 'divider')
      const title = (firstUser?.kind === 'user' ? firstUser.text : firstTopic?.kind === 'divider' ? firstTopic.text : '').slice(0, 60) || undefined
      const t = window.setTimeout(() => {
        fetch(`/api/chats/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ items: keep, title }) }).catch(() => {})
      }, 900)
      return () => window.clearTimeout(t)
    }
    if (storageKey) sessionSet(storageKey, { items: clean(items), conversationId: conversationId.current })
  }, [items, storageKey, restored, threadId])

  // ---------- low-level helpers ----------
  const add = useCallback((item: Item) => setItems((list) => [...list, (item.kind === 'bot' || item.kind === 'card' || item.kind === 'typing') && !item.by ? { ...item, by: whoRef.current } : item]), [])
  const replace = useCallback((id: string, next: Item | null) => setItems((list) => (next ? list.map((i) => (i.id === id ? next : i)) : list.filter((i) => i.id !== id))), [])

  const settle = useCallback((kind: Pending['kind'], value: unknown, cardId?: string) => {
    const idx = pending.current.findLastIndex((p) => p.kind === kind && (kind !== 'live' || p.cardId === cardId))
    if (idx < 0) return false
    const [p] = pending.current.splice(idx, 1)
    p.resolve(value)
    return true
  }, [])

  /**
   * Types a message out word by word, like a person typing quickly (never more than about a second).
   * `alive` lets a flow stop mid-message when the learner moves on; the full text is then shown.
   */
  const typeOut = useCallback(async (id: string, text: string, base: Omit<Extract<Item, { kind: 'bot' }>, 'text'>, alive?: () => void) => {
    const words = text.split(/(\s+)/)
    if (reduced.current || words.length < 6) { replace(id, { ...base, text }); return }
    const step = Math.max(14, Math.min(42, 1100 / words.length))
    for (let n = 2; n < words.length; n += 2) {
      replace(id, { ...base, text: words.slice(0, n).join('') })
      await sleep(step)
      try { alive?.() } catch (e) { replace(id, { ...base, text }); throw e }
    }
    replace(id, { ...base, text })
  }, [replace])

  /** A short, slightly varied pause before typing starts (people pause to read and think). */
  const thinkMs = (text: string) => Math.round(260 + Math.random() * 320 + Math.min(260, text.length * 2))

  /** Adds the learner's own message (a tap or typed text) to the conversation. */
  const userSays = useCallback((text: string) => add({ id: newId(), at: Date.now(), kind: 'user', text }), [add])

  // ---------- AI (the counsellor's own words) ----------
  const ai = useCallback(async ({ message, intent, context, pending, counsel }: AiOpts): Promise<AiResult> => {
    const typingId = newId()
    setSuggestions([])
    setCallOffer(false)
    setThinking(true)
    add({ id: typingId, at: Date.now(), kind: 'typing' })
    const res = await postJson('/api/assistant', { context, message, intent, conversationId: conversationId.current, pending, counsel })
    setThinking(false)
    if (!res.ok) {
      replace(typingId, { id: typingId, at: Date.now(), kind: 'bot', by: whoRef.current, text: res.status === 401 ? 'Please sign in again so I can pick up where we left off.' : res.error })
      return {}
    }
    if (typeof res.data.conversationId === 'string') conversationId.current = res.data.conversationId
    const action = (res.data.action as { href: string; label: string } | null) ?? null
    const f = res.data.followUp as AiResult['followUp'] | undefined
    const out: AiResult = {
      choice: typeof res.data.choice === 'string' ? res.data.choice : undefined, goNow: res.data.goNow === true, action,
      show: typeof res.data.show === 'string' ? res.data.show : undefined,
      followUp: f && typeof f.question === 'string' && Array.isArray(f.options) ? { question: f.question, options: f.options.filter((o) => typeof o === 'string') } : undefined,
      suggestTrack: typeof res.data.suggestTrack === 'string' ? res.data.suggestTrack : undefined,
    }
    const reply = String(res.data.reply ?? '').trim()
    if (!reply) { replace(typingId, null); return out }
    // While counselling, the route becomes one of the options instead of a button on the message.
    await typeOut(typingId, reply, { id: typingId, at: Date.now(), kind: 'bot', by: whoRef.current, action: out.goNow || counsel ? null : action })
    // While a question is waiting, the learner answers that; suggestions would only compete with it.
    setSuggestions(!pending && !counsel && Array.isArray(res.data.suggestions) ? (res.data.suggestions as string[]).slice(0, 3) : [])
    if (res.data.offerCall === true) setCallOffer(true)
    return out
  }, [add, replace, typeOut])

  /** The question the current options belong to (the counsellor's last message). */
  const lastQuestion = () => {
    const last = [...itemsRef.current].reverse().find((i) => i.kind === 'bot')
    return last && last.kind === 'bot' ? last.text.slice(0, 200) : ''
  }

  // ---------- flows ----------
  const makeBot = useCallback((t: number, d?: number): Bot => {
    const alive = () => { if (t !== token.current || (d !== undefined && d !== detourToken.current)) throw CANCELLED }
    const wait = async (ms: number) => { alive(); await sleep(reduced.current ? Math.min(ms, 150) : ms); alive() }
    const waitFor = <T,>(p: Omit<Pending, 'resolve' | 'reject'>) => new Promise<T>((resolve, reject) => {
      pending.current.push({ ...p, resolve: resolve as (v: unknown) => void, reject })
    })
    return {
      alive,
      wait,
      hasSaid: (test) => itemsRef.current.some((i) => i.kind === 'bot' && test(i.text)),
      event(text, tone = 'info') { alive(); add({ id: newId(), at: Date.now(), kind: 'event', text, tone }) },
      speakAs(id) { alive(); whoRef.current = id; setWho(id) },
      async say(text, opts) {
        alive()
        // Never say the same thing twice in a row (e.g. "Welcome back" on every reload).
        const last = [...itemsRef.current].reverse().find((i) => i.kind !== 'typing' && i.kind !== 'event')
        if (last?.kind === 'bot' && last.text === text) return
        const id = newId()
        if (!opts?.quick) {
          add({ id, at: Date.now(), kind: 'typing' })
          try { await wait(thinkMs(text)) } catch (e) { replace(id, null); throw e }
          await typeOut(id, text, { id, at: Date.now(), kind: 'bot', by: whoRef.current, action: opts?.action ?? null }, alive)
        } else add({ id, at: Date.now(), kind: 'bot', text, action: opts?.action ?? null })
      },
      divider(text) { alive(); add({ id: newId(), at: Date.now(), kind: 'divider', text }) },
      card(card) { alive(); const id = newId(); add({ id, at: Date.now(), kind: 'card', card }); return id },
      async live<T>(card: Card) {
        alive()
        const id = newId()
        add({ id, at: Date.now(), kind: 'card', card, live: true })
        const value = await waitFor<T>({ kind: 'live', cardId: id })
        alive()
        setItems((list) => list.map((i) => (i.id === id && i.kind === 'card' ? { ...i, live: false } : i)))
        return value
      },
      update(id, card) { setItems((list) => list.map((i) => (i.id === id && i.kind === 'card' ? { ...i, card } : i))) },
      remove(id) { replace(id, null) },
      async choose(choices, opts) {
        alive()
        setPrompt({ choices, style: opts?.style ?? 'rows', question: lastQuestion() })
        const picked = await waitFor<Picked>({ kind: 'choose' })
        alive()
        setPrompt(null)
        if (opts?.echo !== false && !picked.typed) userSays(picked.label)
        const { typed: _typed, ...choice } = picked
        return choice
      },
      async chooseMany(choices, doneLabel = 'Continue') {
        alive()
        setSuggestions([])
        setPrompt({ choices, style: 'chips', multi: true, doneLabel, question: lastQuestion() })
        const picked = await waitFor<Picked[]>({ kind: 'choose' })
        alive()
        setPrompt(null)
        if (!picked.some((p) => p.typed)) userSays(picked.map((c) => c.label).join(', '))
        return picked.map(({ typed: _typed, ...c }) => c)
      },
      async ask(a, opts) {
        alive()
        setAsking(a)
        const value = await waitFor<string>({ kind: 'ask' })
        alive()
        setAsking(null)
        userSays(opts?.echo ? opts.echo(value) : value)
        return value
      },
      async ai(opts) { alive(); const r = await ai(opts); alive(); return r },
    }
  }, [add, ai, replace, typeOut, userSays])

  /** Runs a flow, cancelling whatever was running. */
  const run = useCallback((flow: (bot: Bot) => Promise<void>) => {
    const t = ++token.current
    detourToken.current++
    detourMark.current = null
    savedPrompt.current = null
    flowActive.current = t
    for (const p of pending.current.splice(0)) p.reject(CANCELLED)
    setPrompt(null)
    setAsking(null)
    setSuggestions([])
    setItems((list) => list.filter((i) => i.kind !== 'typing' && !(i.kind === 'card' && i.live)))
    flow(makeBot(t)).catch((e) => {
      if (isCancelled(e)) return
      console.error('[chat] flow failed', e)
      add({ id: newId(), at: Date.now(), kind: 'bot', text: 'Sorry, something went wrong on my side. Please try that again.' })
    }).finally(() => { if (flowActive.current === t) flowActive.current = 0 })
  }, [add, makeBot])

  /**
   * A side conversation: the learner typed something that isn't an answer to the question on screen. The question
   * (and the flow waiting on it) is set aside, not cancelled; `restore` brings it back exactly as it was.
   * Starting another side conversation replaces the current one; starting a flow ends both.
   */
  const detour = useCallback((flow: (bot: Bot, d: Detour) => Promise<void>) => {
    if (detourMark.current !== null) for (const p of pending.current.splice(detourMark.current)) p.reject(CANCELLED)
    else savedPrompt.current = promptRef.current
    const d = ++detourToken.current
    detourMark.current = pending.current.length
    setPrompt(null)
    setSuggestions([])
    const restore = () => {
      if (d !== detourToken.current) return false
      const p = savedPrompt.current
      savedPrompt.current = null
      detourMark.current = null
      detourToken.current++
      if (p && pending.current.some((x) => x.kind === 'choose')) { setPrompt(p); return true }
      return false
    }
    flow(makeBot(token.current, d), { question: savedPrompt.current?.question ?? null, restore }).catch((e) => {
      if (isCancelled(e)) return
      console.error('[chat] side conversation failed', e)
      restore()
    })
  }, [makeBot])
  /** True while a flow is doing something other than waiting on the options (typing, building a report, a live card). */
  const busy = useCallback(() => flowActive.current !== 0 && !promptRef.current, [])
  const inDetour = useCallback(() => detourMark.current !== null, [])

  // ---------- what the UI calls ----------
  const pick = useCallback((choice: Choice) => settle('choose', choice), [settle])
  const pickMany = useCallback((choices: Choice[]) => settle('choose', choices), [settle])
  /** The learner typed an answer to the options on screen: continue the flow with it (their words are already shown). */
  const pickTyped = useCallback((picked: Choice | Choice[]) => settle('choose', Array.isArray(picked) ? picked.map((c) => ({ ...c, typed: true })) : { ...picked, typed: true }), [settle])
  const cardDone = useCallback((cardId: string, value: unknown) => settle('live', value, cardId), [settle])
  /** Text typed in the box: answers the current question if there is one; otherwise returns false (free chat). */
  const answer = useCallback((text: string) => settle('ask', text), [settle])

  /** A message from the bot outside any flow (e.g. a reply to text typed mid-flow). */
  const note = useCallback((text: string) => add({ id: newId(), at: Date.now(), kind: 'bot', text }), [add])
  /** "Tanya joined the chat" / "Riya disconnected": shown as a small notice, not a message. */
  const event = useCallback((text: string, tone: 'join' | 'leave' | 'info' = 'info') => add({ id: newId(), at: Date.now(), kind: 'event', text, tone }), [add])
  /** A card that stays in the conversation (saved with the chat), added outside any flow. */
  const addStaticCard = useCallback((card: Card) => add({ id: newId(), at: Date.now(), kind: 'card', card }), [add])
  /** A self-contained card added outside any flow (e.g. from the call button). */
  const addCard = useCallback((card: Card) => add({ id: newId(), at: Date.now(), kind: 'card', card, live: true }), [add])
  const speakAs = useCallback((id: string) => { whoRef.current = id; setWho(id) }, [])
  /** Puts an earlier conversation (e.g. the one before sign-up) in front of this one. */
  const adopt = useCallback((earlier: Item[]) => setItems((list) => [...earlier.filter((i) => i.kind !== 'typing' && !(i.kind === 'card' && i.live)), ...list]), [])

  return {
    items, prompt, asking, suggestions, thinking, restored, signedIn,
    run, detour, busy, inDetour, pick, pickMany, cardDone, answer, userSays, note, adopt, ai, setSuggestions,
    who, speakAs, event, addCard, addStaticCard, callOffer, setCallOffer, pickTyped,
    hasHistory: items.length > 0,
  }
}

export type ChatApi = ReturnType<typeof useChat>
