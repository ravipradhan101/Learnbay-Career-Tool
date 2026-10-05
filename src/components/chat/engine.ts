'use client'

// The conversation engine behind the chat (Lumi the guide, then the counsellor). Flows are plain async scripts ("say this, then ask that"):
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

/** A project picked from the library for this learner (kept in the card so a reopened chat shows the same ones). */
export type ProjectItem = { title: string; description: string; tools: string[]; kind: string; domain: string | null; domainLabel?: string | null }

export type Choice = {
  id: string; label: string; hint?: string; icon?: IconName
  /** Words that mean this option when typed ("fintech" → Banking & finance). */
  keywords?: string[]
  /** The learner's own words, when they typed an answer that none of the options covers (picked as "Other"). */
  text?: string
}
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
  | { type: 'skill-matrix'; skills: { id: string; label: string }[] }
  | { type: 'program'; interest: string; programId?: string; asked?: boolean }
  | { type: 'proof' }
  | { type: 'projects'; interest: string; programId?: string; items?: ProjectItem[] }
  | { type: 'roles'; roles: string[]; note: string | null; programId?: string }
  | { type: 'career-path'; interest: string; from?: string }
  | { type: 'why'; interest: string; programId?: string }
  | { type: 'curriculum'; interest: string; programId?: string }
  | { type: 'refund' }
  | { type: 'companies' }
  | { type: 'elig-push' }
  | { type: 'decision'; eligible: boolean | null; programId?: string }
  | { type: 'bridge'; have: string[]; add: string[]; role: string; readiness: number | null; program: string }
  | { type: 'fit'; rows: { programId: string; name: string; score: number; reasons: string[] }[] }

type Base = { id: string; at: number }
export type Item = Base & (
  | { kind: 'bot'; text: string; action?: { href: string; label: string } | null; by?: string }
  | { kind: 'event'; text: string; tone: 'join' | 'leave' | 'info' }
  | { kind: 'user'; text: string }
  | { kind: 'divider'; text: string }
  | { kind: 'card'; card: Card; live?: boolean; by?: string }
  | { kind: 'typing'; by?: string }
)

export type Prompt = {
  choices: Choice[]; style: 'rows' | 'chips'; multi?: boolean; doneLabel?: string; question?: string
  /** The option a typed answer becomes when none of the others fits (e.g. "Other" for an industry not listed). */
  other?: string
}
/** A long counsellor answer, split: the learner picks which part to read next. */
export type MorePart = { title: string; detail: string }
/** What the learner typed while options were showing, understood as one of them (`typed` = don't echo it again). */
type Picked = Choice & { typed?: boolean }
/** `label` is shown above the box so it's obvious the answer is typed there (e.g. "Your first name"). */
export type Asking = { placeholder: string; label?: string; inputMode?: 'text' | 'email' | 'numeric'; maxLength?: number }

/** Cards worth keeping when the chat is reopened; interactive ones (forms, the running test) are not. */
const PERSIST = new Set<Card['type']>(['readiness', 'report', 'elig-result', 'usp', 'intro', 'counsellor', 'program', 'proof', 'projects', 'career-path', 'why', 'curriculum', 'refund', 'elig-push', 'decision', 'roles', 'fit', 'bridge', 'companies'])
const MAX_SAVED = 70

export const CANCELLED = Symbol('cancelled')

export type AiResult = {
  choice?: string; goNow?: boolean; action?: { href: string; label: string } | null; show?: string
  /** Counselling: a probing question with the learner's likely answers, and a better-fitting track (if any). */
  followUp?: { question: string; options: string[] }; suggestTrack?: string; suggestProgram?: string
  /** The counsellor updated the learner's profile from this message (the question on screen may no longer apply). */
  profileUpdated?: boolean
  /** The Learnbay program this answer is about (the one the learner named), if any. */
  programId?: string
  /** The counsellor could not be reached (an error message is already in the chat). */
  failed?: boolean
}
export type AiOpts = {
  message?: string; intent?: 'welcome' | 'report' | 'need' | 'analysis'; context: string
  pending?: { question: string; options: { id: string; label: string }[] }
  counsel?: { was: string; round: number }
}
/** What a side conversation can do with the question it set aside. */
export type Detour = { question: string | null; restore: () => boolean }

/** A short description of a card, for the counsellor's view of the conversation. */
function cardLabel(c: Card): string {
  switch (c.type) {
    case 'report': return `their ${c.card.tool} report (${c.card.summary.headline.label}: ${c.card.summary.headline.value})`
    case 'program': return `program card: ${c.programId ?? 'recommended program'}${c.asked ? ' (they asked about it)' : ''}`
    case 'curriculum': return `curriculum of ${c.programId ?? 'their program'}`
    case 'projects': return `projects: ${(c.items ?? []).map((p) => p.title).slice(0, 4).join('; ')}`
    case 'roles': return `roles they can aim for: ${c.roles.join(', ')}`
    case 'fit': return `fit scores: ${c.rows.map((r) => `${r.name} ${r.score}/10`).join(', ')}`
    case 'elig-result': return `eligibility result: ${c.result.score}/100`
    case 'booking': return 'booking a call with a Senior Counsellor'
    case 'bridge': return `transition plan: has ${c.have.join(', ')}; needs ${c.add.join(', ')}`
    default: return `${c.type} card`
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+#.]+/g, ' ').replace(/(^|\s)\.|\.(\s|$)/g, '$1$2').trim()

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
}

/** The range an option stands for: "3–5 years" → [3, 5], "15+ years" / "Above ₹50 LPA" → [15, ∞), "Below ₹3 LPA" → [0, 3], "Fresher" → [0, 0]. */
function rangeOf(label: string): [number, number] | null {
  const l = label.toLowerCase()
  if (/\bfresher\b/.test(l)) return [0, 0]
  const nums = [...l.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
  if (!nums.length) return null
  if (/\+|above|over|more than/.test(l)) return [nums[0], Infinity]
  if (/below|under|less than/.test(l)) return [0, nums[0]]
  return [nums[0], nums[1] ?? nums[0]]
}

/** A short answer that is just an amount: "5", "5 years", "around 7 yrs", "twelve lpa", "no experience". */
function amountIn(t: string): number | null {
  if (/^(no|zero|none|nil)( work)? (experience|exp)$|^fresher$|^just (graduated|passed out)$/.test(t)) return 0
  if (t.split(' ').length > 6) return null
  const unit = '(years?|yrs?|y|yr|lpa|lakhs?|lacs?|l|hours?|hrs?|h|per week|a week|of experience|experience|exp)'
  const m = t.match(new RegExp(`^(?:about |around |approx |approximately |nearly |almost |over |more than |close to )?(\\d+(?:\\.\\d+)?|${Object.keys(WORD_NUMBERS).join('|')})\\s*\\+?\\s*(?:${unit}\\s*)*$`))
  if (!m) return null
  return m[1] in WORD_NUMBERS ? WORD_NUMBERS[m[1]] : Number(m[1])
}

const TECH_TERMS = /\b(llms?|html|css|sdlc|ssrs|ssis|mlops|llmops|devops|aiops|sql|nlp|rpa|crm|erp|pwc|kpmg|hcl|tcs|ntt|dxc|lpa|ctc|mba|bca|mca|btech|mtech|phd|bsc|msc|gcp|gpt|bfsi|fmcg|hr|qa|sde|fde|ui|ux|api|aws|dbms|rdbms|jvm|js|ts)\b/

/**
 * Keyboard mashing or random letters ("asdfgh", "xkcdqrtz", "hhhhhh"): not a message the counsellor can read.
 * Kept conservative: acronyms (SQL, LLMs, BFSI) and short replies (ok, hmm, no) are never gibberish.
 */
export function looksLikeGibberish(text: string): boolean {
  const raw = text.trim()
  const t = raw.toLowerCase()
  if (!t || /^(ok+|okay|hmm+|yes|yeah|yep|no|nope|hi+|hello|hey|thanks|thank you|k+|sure|fine|done|what|why|how)[.!?]*$/.test(t)) return false
  if (TECH_TERMS.test(t)) return false
  if (/^[^\p{L}\p{N}]+$/u.test(t)) return true
  const words = raw.split(/\s+/).filter((w) => /\p{L}/u.test(w) && w !== w.toUpperCase())
  const lower = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean)
  if (!lower.length) return false
  if (/(asdf|qwert|zxcv|hjkl|sdfg|dfgh|fghj|ghjk|jkjk|lkjh|poiu|mnbv|uiop)/.test(t)) return true
  if (/(\p{L})\1{3,}/u.test(t) && lower.length <= 2) return true
  const noVowel = lower.filter((w) => w.length >= 4 && !/[aeiouy]/.test(w)).length
  if (noVowel >= 2 && noVowel >= Math.ceil(lower.length / 2)) return true
  if (lower.length === 1 && lower[0].length >= 6) {
    const v = (lower[0].match(/[aeiouy]/g) ?? []).length
    if (v / lower[0].length < 0.15) return true
  }
  return false
}

/** Typed text that asks something ("which one fits me?", "how long is the course") rather than answering. */
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase()
  return /\?\s*$/.test(t) || /^(what|which|how|why|when|where|who|whom|whose|can|could|should|would|will|is|are|am|do|does|did|may|shall|tell me|explain|i want to know|i have a question)\b/.test(t)
}

/**
 * Understands typed text as the options on screen when it clearly is: "2", "5 years", "software engineer",
 * "python and sql", "fintech" (a keyword). Anything less clear goes to the counsellor, who reads it in context.
 */
export function matchTyped(text: string, prompt: Prompt): Choice | Choice[] | null {
  const t = norm(text)
  if (!t) return null
  const choices = prompt.choices
  // Options that are amounts (years, ₹ LPA, hours): "5" means 5 years (the 3–5 band), never "option 5".
  const ranged = choices.map((c) => ({ c, r: rangeOf(c.label) })).filter((x): x is { c: Choice; r: [number, number] } => x.r !== null)
  if (!prompt.multi && ranged.length >= 3) {
    const n = amountIn(t)
    if (n !== null) {
      const fits = ranged.filter((x) => x.r[0] <= n).sort((a, b) => b.r[0] - a.r[0])
      if (fits[0]) return fits[0].c
    }
  }
  // "2" picks the second option, but only when no option has a number in it.
  const n = ranged.length === 0 && /^\d{1,2}$/.test(t) ? Number(t) : NaN
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
  const byKeyword = choices.filter((c) => c.keywords?.some((k) => new RegExp(`(^| )${norm(k)}s?( |$)`).test(t)))
  if (byKeyword.length === 1) return byKeyword[0]
  return null
}

/**
 * A typed answer that none of the options covers, for a question that takes one ("Other: logistics").
 * Questions and long messages are left to the counsellor.
 */
export function otherAnswer(text: string, prompt: Prompt): Choice | null {
  const other = prompt.other ? prompt.choices.find((c) => c.id === prompt.other) : undefined
  const own = text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
  if (!other || prompt.multi || looksLikeQuestion(own) || own.length < 2 || own.split(' ').length > 8) return null
  const cleaned = own.replace(/^(i am|i'm|im|i work|working|we are)( in| at| for| into| with)?( the| a| an)?\s+/i, '').replace(/\s+(industry|sector|domain|field)$/i, '').slice(0, 60)
  return { ...other, text: cleaned.charAt(0).toUpperCase() + cleaned.slice(1) }
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
  /** `other`: the option a typed answer becomes when no option fits (its words come back in `text`). */
  choose: (choices: Choice[], opts?: { style?: 'rows' | 'chips'; echo?: boolean; other?: string }) => Promise<Choice>
  chooseMany: (choices: Choice[], doneLabel?: string) => Promise<Choice[]>
  ask: (asking: Asking, opts?: { echo?: (v: string) => string }) => Promise<string>
  ai: (opts: AiOpts) => Promise<AiResult>
  wait: (ms: number) => Promise<void>
  alive: () => void
}

export function useChat({ storageKey, signedIn, speaker, threadId = null, onProfile }: {
  storageKey: string | null; signedIn: boolean; speaker: string; threadId?: string | null
  /** The counsellor updated the profile from what the learner said (so cards and suggestions follow). */
  onProfile?: (answers: Answers, reportsReset: boolean) => void
}) {
  const onProfileRef = useRef(onProfile)
  onProfileRef.current = onProfile
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
  // Who is talking now (Lumi or the allocated counsellor); every message remembers who said it.
  const [who, setWho] = useState(speaker)
  const whoRef = useRef(speaker)
  whoRef.current = who
  const [callOffer, setCallOffer] = useState(false)
  // The last thing the counsellor said, kept as it is said (the list on screen updates a moment later).
  const lastSaid = useRef('')
  const itemsRef = useRef<Item[]>([])
  // The latest unsaved state of the chat; switching chats sends it straight away instead of dropping it.
  const unsaved = useRef<{ id: string; body: string } | null>(null)
  const flush = () => {
    const p = unsaved.current
    unsaved.current = null
    if (p) fetch(`/api/chats/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: p.body, keepalive: true }).catch(() => {})
  }
  itemsRef.current = items

  // ---------- persistence ----------
  // Signed in: each chat is a saved thread on the server (so it is there on any device).
  // Before sign-up: the conversation is kept in this browser only.
  const clean = (list: Item[]) => list.filter((i) => i.kind !== 'typing' && !(i.kind === 'card' && (i.live || !PERSIST.has(i.card.type)))).slice(-MAX_SAVED)
  useEffect(() => {
    reduced.current = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    clearCachedChats()
    flush()
    lastSaid.current = ''
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
      // A section's chat is named after the section ("Salary Benchmark"); a free chat after the first thing asked.
      const title = (firstTopic?.kind === 'divider' ? firstTopic.text : firstUser?.kind === 'user' ? firstUser.text : '').slice(0, 60) || undefined
      unsaved.current = { id: threadId, body: JSON.stringify({ items: keep, title }) }
      const t = window.setTimeout(flush, 900)
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
   * How long the "typing…" dots show before a message appears whole, like a person reading, then typing it:
   * a varied pause plus a little per character (about 1–3 seconds; long messages don't keep people waiting).
   */
  const typingMs = (text: string) => Math.round(550 + Math.random() * 450 + Math.min(1900, text.length * 11))

  /** A long answer with key points: the lead goes out first, and the learner picks which point to read next. */
  const [more, setMore] = useState<MorePart[]>([])
  const splitLong = (text: string): { head: string; parts: MorePart[] } | null => {
    if (text.split(/\s+/).length <= 45) return null
    const lines = text.split('\n')
    const parts: MorePart[] = []
    const head: string[] = []
    for (const line of lines) {
      const m = line.match(/^- \*\*(.+?)\*\*:?\s*(.+)$/)
      if (m) parts.push({ title: m[1].replace(/[:.]$/, ''), detail: m[2] })
      else head.push(line)
    }
    return parts.length >= 2 && head.join(' ').trim() ? { head: head.join('\n'), parts } : null
  }

  /** Adds the learner's own message (a tap or typed text) to the conversation. */
  const userSays = useCallback((text: string) => add({ id: newId(), at: Date.now(), kind: 'user', text }), [add])

  /**
   * The conversation as the learner sees it (scripted questions, what they picked, cards shown), so the counsellor
   * answers in context, not only from her own earlier replies.
   */
  const recentTranscript = () => {
    const lines: string[] = []
    for (const i of itemsRef.current.slice(-18)) {
      if (i.kind === 'user') lines.push(`Learner: ${i.text}`)
      else if (i.kind === 'bot') lines.push(`${i.by === 'bot' ? 'Lumi' : 'Counsellor'}: ${i.text}`)
      else if (i.kind === 'card') lines.push(`[On screen: ${cardLabel(i.card)}]`)
      else if (i.kind === 'divider') lines.push(`--- ${i.text} ---`)
    }
    return lines.map((l) => l.replace(/\s+/g, ' ').slice(0, 260)).slice(-16)
  }

  // ---------- AI (the counsellor's own words) ----------
  const ai = useCallback(async ({ message, intent, context, pending, counsel }: AiOpts): Promise<AiResult> => {
    const typingId = newId()
    setSuggestions([])
    setMore([])
    setCallOffer(false)
    setThinking(true)
    add({ id: typingId, at: Date.now(), kind: 'typing' })
    const started = Date.now()
    const res = await postJson('/api/assistant', { context, message, intent, conversationId: conversationId.current, pending, counsel, recent: recentTranscript() })
    setThinking(false)
    if (!res.ok) {
      replace(typingId, { id: typingId, at: Date.now(), kind: 'bot', by: whoRef.current, text: res.status === 401 ? 'Please sign in again so I can pick up where we left off.' : res.error })
      return { failed: true }
    }
    if (typeof res.data.conversationId === 'string') conversationId.current = res.data.conversationId
    if (res.data.answers && typeof res.data.answers === 'object') onProfileRef.current?.(res.data.answers as Answers, res.data.reportsReset === true)
    const action = (res.data.action as { href: string; label: string } | null) ?? null
    const f = res.data.followUp as AiResult['followUp'] | undefined
    const out: AiResult = {
      choice: typeof res.data.choice === 'string' ? res.data.choice : undefined, goNow: res.data.goNow === true, action,
      show: typeof res.data.show === 'string' ? res.data.show : undefined,
      followUp: f && typeof f.question === 'string' && Array.isArray(f.options) ? { question: f.question, options: f.options.filter((o) => typeof o === 'string') } : undefined,
      suggestTrack: typeof res.data.suggestTrack === 'string' ? res.data.suggestTrack : undefined,
      suggestProgram: typeof res.data.suggestProgram === 'string' ? res.data.suggestProgram : undefined,
      profileUpdated: Boolean(res.data.answers && typeof res.data.answers === 'object'),
      programId: typeof res.data.programId === 'string' ? res.data.programId : undefined,
    }
    const reply = String(res.data.reply ?? '').trim()
    if (!reply) { replace(typingId, null); return out }
    // A long answer goes out as its lead; the learner picks which point to read next.
    const split = intent ? null : splitLong(reply)
    const shown = split ? split.head : reply
    // The dots stay a moment longer if the answer came back faster than a person could have typed it.
    const left = reduced.current ? 0 : typingMs(shown) - (Date.now() - started)
    if (left > 0) await sleep(left)
    // While counselling, the route becomes one of the options instead of a button on the message.
    lastSaid.current = shown
    replace(typingId, { id: typingId, at: Date.now(), kind: 'bot', by: whoRef.current, text: shown, action: out.goNow || counsel || intent ? null : action })
    setMore(split ? split.parts : [])
    // While a question is waiting, the learner answers that; suggestions would only compete with it.
    setSuggestions(!pending && !counsel && Array.isArray(res.data.suggestions) ? (res.data.suggestions as string[]).slice(0, 3) : [])
    if (res.data.offerCall === true) setCallOffer(true)
    return out
  }, [add, replace])

  /** The learner picked one part of a long answer (or all of them) to read next. */
  const readMore = useCallback(async (index: number | 'all') => {
    const parts = index === 'all' ? more : more[index] ? [more[index]] : []
    if (!parts.length) return
    setMore((list) => (index === 'all' ? [] : list.filter((_, i) => i !== index)))
    add({ id: newId(), at: Date.now(), kind: 'user', text: index === 'all' ? 'Show me everything' : parts[0].title })
    const id = newId()
    const text = parts.length === 1 ? `**${parts[0].title}**\n${parts[0].detail}` : parts.map((p) => `- **${p.title}**: ${p.detail}`).join('\n')
    add({ id, at: Date.now(), kind: 'typing' })
    await sleep(reduced.current ? 100 : 500 + Math.min(1100, text.length * 6))
    replace(id, { id, at: Date.now(), kind: 'bot', by: whoRef.current, text })
  }, [add, more, replace])

  /** The question the current options belong to (the counsellor's last message). */
  const lastQuestion = () => {
    if (lastSaid.current) return lastSaid.current.slice(0, 200)
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
          // "Typing…" dots, then the whole message at once (like a person hitting send).
          add({ id, at: Date.now(), kind: 'typing' })
          try { await wait(typingMs(text)) } catch (e) { replace(id, null); throw e }
          lastSaid.current = text
          replace(id, { id, at: Date.now(), kind: 'bot', by: whoRef.current, text, action: opts?.action ?? null })
        } else { lastSaid.current = text; add({ id, at: Date.now(), kind: 'bot', text, action: opts?.action ?? null }) }
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
        // Options on screen: suggested questions would only crowd them.
        setSuggestions([])
        setPrompt({ choices, style: opts?.style ?? 'rows', question: lastQuestion(), other: opts?.other })
        const picked = await waitFor<Picked>({ kind: 'choose' })
        alive()
        setPrompt(null)
        if (detourMark.current === null) savedPrompt.current = null
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
  }, [add, ai, replace, userSays])

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
    setMore([])
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
    else savedPrompt.current = promptRef.current ?? savedPrompt.current
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
  /**
   * The learner typed instead of tapping: the options go away at once (they reappear only if the counsellor
   * decides the question still stands). The flow waiting on them is untouched.
   */
  const stash = useCallback(() => {
    if (!promptRef.current) return
    if (detourMark.current === null) savedPrompt.current = promptRef.current
    setPrompt(null)
  }, [])
  /** Brings back options put away by `stash` (e.g. the counsellor could not be reached). */
  const unstash = useCallback(() => {
    const p = savedPrompt.current
    if (p && detourMark.current === null && pending.current.some((x) => x.kind === 'choose')) { savedPrompt.current = null; setPrompt(p) }
  }, [])
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
    items, prompt, asking, suggestions, thinking, restored, signedIn, more, readMore,
    run, detour, busy, inDetour, stash, unstash, pick, pickMany, cardDone, answer, userSays, note, adopt, ai, setSuggestions,
    who, speakAs, event, addCard, addStaticCard, callOffer, setCallOffer, pickTyped,
    hasHistory: items.length > 0,
  }
}

export type ChatApi = ReturnType<typeof useChat>
