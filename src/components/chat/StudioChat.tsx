'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, type IconName } from '../Icon'
import { Logo } from '../Logo'
import { LogoutButton } from '../LogoutButton'
import { ChatWindow } from './ChatWindow'
import { looksLikeGibberish, matchTyped, otherAnswer, useChat, type Bot, type Item, type ProjectItem } from './engine'
import { ADOPT_KEY, sectionResume, counselFlow, trackChangeFlow, eligibilityFlow, endFlow, homeFlow, meetFlow, masterclassFlow, restartFlow, sessionsFlow, switchFlow, toolFlow, type StudioCtx } from './flows'
import { StudioPanel } from './StudioPanel'
import { LumiGuide, type GuideHandle, type GuideLine } from './LumiGuide'
import { LumiTour, type TourStep } from './LumiTour'
import { CounsellorProfile } from './CounsellorProfile'
import { askForNotifications, canAskForNotifications, useAwayAlert } from './useAwayAlert'
import { track as trackEvent } from '@/lib/analytics'
import { Avatar } from './Avatar'
import { skillFamily } from '@/lib/skills'
import { programForLearner } from '@/lib/segments'
import { SESSION_ENDED, clearGuestChat, getJson, postJson, sessionGet as storageGet, sessionSet as storageSet } from '@/lib/client'
import { COUNSELLOR_TITLE, askedFor, getCounsellor } from '@/lib/counsellors'
import { initials, trackOf, type Answers } from '@/lib/questions'
import type { ToolState } from '@/lib/report-card'
import { TOOLS, getTool, type ToolId } from '@/lib/tools-meta'

type Topic = 'home' | ToolId | 'eligibility' | 'sessions' | 'masterclasses' | 'other'
type Mode = 'first' | 'returning' | 'menu' | 'handover'
type Thread = { id: string; title: string; counsellor: string | null; topic: string | null; updated_at: string }
/** Which saved chat a page opens: each section keeps its own; home and the other pages share the main chat. */
type ChatKey = Exclude<Topic, 'other'>
const chatKeyOf = (t: Topic): ChatKey => (t === 'other' ? 'home' : t)

export type StudioData = {
  userId: string
  name: string
  first: string
  answers: Answers
  tools: Record<ToolId, ToolState>
  eligibilityVisible: boolean
  eligibilityDone: boolean
  hasSession: boolean
  latestSession: StudioCtx['latestSession']
  firstTime: boolean
  /** The allocated counsellor (round robin); isNew = allocated on this visit. */
  counsellor: { id: string; prev: string | null; isNew: boolean }
  counsellorRating: { avg: number; count: number } | null
  /** Every counsellor's rating (the header and profile box show the one you're talking to). */
  counsellorRatings: Record<string, { avg: number; count: number }>
  phoneMasked: string
}

function topicOf(path: string): Topic {
  const seg = path.split('/')[2] ?? ''
  if (!seg || seg === 'counselling') return 'home'
  if (seg === 'skill-gap' || seg === 'salary' || seg === 'roadmap' || seg === 'eligibility' || seg === 'sessions' || seg === 'masterclasses') return seg
  return 'other'
}
const contextOf = (t: Topic) => (t === 'home' || t === 'other' ? 'advisor' : t)

export function StudioChat({ data, children }: { data: StudioData; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // The main chat of this visit (a refresh continues it; a new visit starts a fresh one, with full context).
  const homeKey = `lcn_thread:${data.userId}`
  const [threadId, setThreadId] = useState<string | null>(null)
  const chat = useChat({
    storageKey: null, signedIn: true, speaker: data.counsellor.id, threadId,
    onProfile: (next, reportsReset) => {
      answersRef.current = { ...answersRef.current, ...next }
      setAnswers(answersRef.current)
      if (reportsReset) {
        const tools = Object.fromEntries(Object.entries(toolsRef.current).map(([id, s]) => [id, s?.status === 'ready' || s?.status === 'failed' ? { status: 'none', card: null } : s])) as Record<ToolId, ToolState>
        toolsRef.current = tools
        setTools(tools)
      }
      chat.event('Plan updated from what you told me', 'info')
    },
  })
  const counsellorRef = useRef({ id: data.counsellor.id, prev: data.counsellor.prev })
  const [tools, setTools] = useState(data.tools)
  const [answers, setAnswers] = useState<Answers>({ ...data.answers })
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
  const [ratings, setRatings] = useState(data.counsellorRatings)
  const guide = useRef<GuideHandle>(null)
  const askRatingRef = useRef<(why: 'end' | 'milestones' | 'leaving') => Promise<void>>(async () => {})
  const threadRef = useRef<string | null>(null)
  // A rating sent from the chat updates the stars on the counsellor's profile straight away.
  useEffect(() => {
    const on = (e: Event) => { const r = (e as CustomEvent).detail; if (r && typeof r.avg === 'number') setRatings((m) => ({ ...m, [counsellorRef.current.id]: r })) }
    window.addEventListener('lcn:rated', on)
    return () => window.removeEventListener('lcn:rated', on)
  }, [])
  // Signed out on this device (expired, or signed out in another tab): one quiet notice with a way back in.
  const sessionNoticeShown = useRef(false)
  useEffect(() => {
    const on = () => {
      if (sessionNoticeShown.current) return
      sessionNoticeShown.current = true
      chat.addStaticCard({ type: 'session-ended' })
    }
    window.addEventListener(SESSION_ENDED, on)
    return () => window.removeEventListener(SESSION_ENDED, on)
  }, [chat])
  const toolsRef = useRef(tools)
  toolsRef.current = tools
  const answersRef = useRef(answers)
  answersRef.current = answers
  const topicRef = useRef<Topic | null>(null)
  const latest = useRef(data.latestSession)
  const [finished, setFinished] = useState({ eligibility: data.eligibilityDone, sessions: data.hasSession })
  const finishedRef = useRef(finished)
  finishedRef.current = finished
  useEffect(() => {
    setFinished((f) => ({ eligibility: f.eligibility || data.eligibilityDone, sessions: f.sessions || data.hasSession }))
  }, [data.eligibilityDone, data.hasSession])

  const startTopic = useRef<(t: Topic, mode: Mode, resumed?: boolean) => void>(() => {})
  const firstRun = useRef(true)
  const noThreadsAtStart = useRef(false)
  // Each section's saved chat, and the chat to start once it has loaded (resumed = it already has messages).
  const chatFor = useRef<Partial<Record<ChatKey, string>>>({})
  const toRun = useRef<{ id: string; key: ChatKey; resumed: boolean; mode?: Mode } | null>(null)
  const threadIdRef = useRef<string | null>(null)
  threadIdRef.current = threadId

  // ---------- chats: one per section, reopened when the learner comes back to it ----------
  const createThread = useCallback(async (key: ChatKey) => {
    const r = await postJson('/api/chats', key === 'home' ? {} : { topic: key })
    const id = r.ok ? String(r.data.id) : null
    if (id) {
      chatFor.current[key] = id
      if (key === 'home') storageSet(homeKey, id)
    }
    return id
  }, [homeKey])

  /** Shows the chat for this page: its saved conversation (then a fresh question), or a new one. */
  const openChat = useCallback(async (t: Topic, opts?: { fresh?: boolean; mode?: Mode }) => {
    const key = chatKeyOf(t)
    let id = opts?.fresh ? undefined : chatFor.current[key]
    const resumed = Boolean(id)
    if (id && id === threadIdRef.current) { startTopic.current(t, opts?.mode ?? 'menu'); return }
    chat.run(async () => {}) // stop whatever the current chat was doing before switching
    if (!id) id = (await createThread(key)) ?? undefined
    if (!id) { startTopic.current(t, 'menu'); return }
    toRun.current = { id, key, resumed, mode: opts?.mode }
    setThreadId(id)
  }, [chat, createThread])

  useEffect(() => {
    clearGuestChat(true)
    let cancelled = false
    ;(async () => {
      const r = await getJson('/api/chats')
      const list = r.ok ? ((r.data.threads as Thread[]) ?? []) : []
      if (cancelled) return
      noThreadsAtStart.current = list.length === 0
      // Sections reopen their latest chat; the main chat continues only on a refresh in the same tab.
      for (const t of list) {
        const key = (t.topic ?? '') as ChatKey
        if (t.topic && !chatFor.current[key]) chatFor.current[key] = t.id
      }
      const wantNew = new URLSearchParams(window.location.search).has('new')
      const home = storageGet<string>(homeKey)
      if (!wantNew && home && list.some((t) => t.id === home && !t.topic)) chatFor.current.home = home
      if (wantNew) router.replace(pathname, { scroll: false })
      await openChat(topicOf(pathname), { fresh: wantNew && chatKeyOf(topicOf(pathname)) === 'home' })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** "New chat": a fresh conversation for the section the learner is in (the old one stays saved). */
  const newChat = useCallback(async () => {
    setDrawer(null)
    await openChat(topicOf(pathname), { fresh: true, mode: 'menu' })
  }, [openChat, pathname])

  // ---------- context for the flows ----------
  const ctx: StudioCtx = useMemo(() => ({
    first: data.first,
    get answers() { return answersRef.current },
    tools: () => toolsRef.current,
    setTool: (id: ToolId, s: ToolState) => setTools((t) => ({ ...t, [id]: s })),
    eligibilityVisible: data.eligibilityVisible,
    get latestSession() { return latest.current },
    set latestSession(v) { latest.current = v },
    go: (href: string) => {
      if (href === 'call') return ctx.call('chat')
      if (href === 'video' || href === 'video:now') return chat.run((bot) => meetFlow(bot, ctx, 'chat', href === 'video:now'))
      if (href.startsWith('switch:')) return chat.run((bot) => switchFlow(bot, ctx, href.slice(7)))
      const t = topicOf(href)
      if (t === topicRef.current) startTopic.current(t, 'menu')
      else router.push(href, { scroll: false })
    },
    userSays: (text: string) => chat.userSays(text),
    get done() { return finishedRef.current },
    markDone: (step: 'eligibility' | 'sessions') => setFinished((s) => ({ ...s, [step]: true })),
    counsellor: () => counsellorRef.current,
    setCounsellor: (id: string, prev: string | null) => { counsellorRef.current = { id, prev }; chat.speakAs(id) },
    call: (source: 'button' | 'chat') => chat.addCard({ type: 'call', source, phone: data.phoneMasked, by: getCounsellor(counsellorRef.current.id).name }),
    saveAnswers: async (patch: Answers) => {
      const res = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: patch }), credentials: 'same-origin',
      }).then((r) => r.json()).catch(() => ({ ok: false }))
      if (!res.ok) return false
      const next = { ...answersRef.current, ...patch, ...(res.answers ?? {}) }
      answersRef.current = next
      setAnswers(next)
      return true
    },
    newChat: () => { void newChat() },
    threadId: () => threadRef.current,
    askRating: (why: 'end' | 'milestones' | 'leaving') => askRatingRef.current(why),
    showCard: (show?: string, about?: string) => {
      const interest = answersRef.current.interest ?? 'ai'
      // The program the learner asked about, else the one recommended for them.
      const programId = about ?? programForLearner(answersRef.current)?.id
      if (show === 'projects') void ctx.projects(programId).then((items) => chat.addStaticCard({ type: 'projects', interest, programId, items }))
      else if (show === 'program') chat.addStaticCard({ type: 'program', interest, programId, asked: Boolean(about) })
      else if (show === 'proof') chat.addStaticCard({ type: 'proof' })
      else if (show === 'strengths') chat.addStaticCard({ type: 'usp', ids: ['mentors', 'projects', 'placement'], lead: 'How Learnbay helps' })
      else if (show === 'compare') chat.addStaticCard({ type: 'why', interest, programId })
      else if (about) chat.addStaticCard({ type: 'program', interest, programId: about, asked: true })
      else if (show === 'curriculum') chat.addStaticCard({ type: 'curriculum', interest, programId })
      else if (show === 'refund') chat.addStaticCard({ type: 'refund' })
      else if (show === 'companies') chat.addStaticCard({ type: 'companies' })
    },
    projects: async (programId?: string) => {
      const r = await getJson(`/api/projects${programId ? `?program=${encodeURIComponent(programId)}` : ''}`)
      return r.ok ? ((r.data.projects as ProjectItem[] | undefined) ?? []) : []
    },
    switchProgram: async (program: string) => {
      const before = answersRef.current
      const r = await postJson('/api/profile/track', { program })
      if (!r.ok) return false
      const next = { ...before, ...((r.data.answers as Answers | undefined) ?? { program }) }
      answersRef.current = next
      setAnswers(next)
      // The server rebuilds reports when the kind of program changes; mirror that here.
      if (skillFamily(next) !== skillFamily(before) || next.interest !== before.interest) {
        const tools = Object.fromEntries(Object.entries(toolsRef.current).map(([id, s]) => [id, s?.status === 'ready' || s?.status === 'failed' ? { status: 'none', card: null } : s])) as Record<ToolId, ToolState>
        toolsRef.current = tools
        setTools(tools)
      }
      return true
    },
    switchTrack: async (interest: string, program?: string) => {
      const r = await postJson('/api/profile/track', program ? { interest, program } : { interest })
      if (!r.ok) return false
      const next = { ...answersRef.current, ...((r.data.answers as Answers | undefined) ?? { interest }) }
      answersRef.current = next
      setAnswers(next)
      // Reports were built for the old track: they are rebuilt for the new one.
      const tools = Object.fromEntries(Object.entries(toolsRef.current).map(([id, s]) => [id, s?.status === 'ready' || s?.status === 'failed' ? { status: 'none', card: null } : s])) as Record<ToolId, ToolState>
      toolsRef.current = tools
      setTools(tools)
      return true
    },
  }), [chat, data.eligibilityVisible, data.first, data.phoneMasked, newChat, router])

  startTopic.current = (t, mode, resumed = false) => {
    if (t === 'other') return
    topicRef.current = t
    // Back in a section with its earlier chat on screen: a welcome back and a fresh question, not the intro again.
    if (resumed && t !== 'home') { chat.run((bot) => sectionResume(bot, ctx, t)); return }
    const flows: Record<ChatKey, (bot: Bot) => Promise<void>> = {
      home: (bot) => homeFlow(bot, ctx, mode),
      'skill-gap': (bot) => toolFlow(bot, ctx, 'skill-gap'),
      salary: (bot) => toolFlow(bot, ctx, 'salary'),
      roadmap: (bot) => toolFlow(bot, ctx, 'roadmap'),
      eligibility: (bot) => eligibilityFlow(bot, ctx),
      sessions: (bot) => sessionsFlow(bot, ctx),
      masterclasses: (bot) => masterclassFlow(bot, ctx),
    }
    chat.run(flows[t])
  }

  // Moving to another page closes the mobile drawers (only then: this must not run on every render of the chat).
  useEffect(() => { setDrawer(null) }, [pathname])
  // Moving to another section opens that section's chat (the first page load is handled when the chats arrive).
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    const t = topicOf(pathname)
    if (t === 'other') return
    void openChat(t)
  }, [pathname, openChat])

  // Once a chat has loaded, start its conversation.
  useEffect(() => {
    const next = toRun.current
    if (!chat.restored || !threadId || !next || next.id !== threadId) return
    toRun.current = null
    const t = topicOf(pathname)
    const here: Topic = chatKeyOf(t) === next.key ? t : next.key
    const hasHistory = chat.items.some((i) => i.kind === 'bot' || i.kind === 'user')
    let mode: Mode = next.mode ?? (hasHistory ? 'returning' : 'menu')
    if (firstRun.current) {
      firstRun.current = false
      const c = data.counsellor
      if (c.isNew) chat.event(`${getCounsellor(c.id).name} joined the chat`, 'join')
      mode = noThreadsAtStart.current || data.firstTime ? 'first' : c.isNew && c.prev ? 'handover' : 'returning'
    }
    // Came back with a different track (re-enquiry): the counsellor asks before changing anything.
    const params = new URLSearchParams(window.location.search)
    const wanted = trackOf(params.get('track') ?? undefined)
    if (wanted) {
      params.delete('track')
      const rest = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
    }
    if (wanted && here === 'home' && wanted.interest !== answersRef.current.interest) {
      topicRef.current = 'home'
      chat.run((bot) => trackChangeFlow(bot, ctx, wanted.interest))
      return
    }
    startTopic.current(here, here === 'home' ? mode : 'menu', next.resumed && hasHistory)
  }, [pathname, chat, chat.restored, chat.items, threadId, data.firstTime, data.counsellor, ctx])

  // Counselling (the learner went off the script): what was set aside, and how many counselling turns so far.
  const counselRound = useRef(0)
  const setAside = useRef<{ was: string; resumeLabel: string }>({ was: 'the chat', resumeLabel: 'Show me my next steps' })

  /** What the learner was doing when they typed, in words for the counsellor and for the "continue" option. */
  const describeAside = (topic: Topic, question: string | null) => {
    if (!question) return { was: 'the chat', resumeLabel: 'Show me my next steps' }
    const tool = topic === 'skill-gap' || topic === 'salary' || topic === 'roadmap' ? getTool(topic) : null
    const q = question.length > 70 ? `${question.slice(0, 70)}…` : question
    if (tool) return { was: `their ${tool.name} (waiting on: "${q}")`, resumeLabel: `Continue with my ${tool.name}` }
    if (topic === 'eligibility') return { was: `the eligibility test (waiting on: "${q}")`, resumeLabel: 'Continue with the eligibility test' }
    if (topic === 'sessions') return { was: 'booking a counselling call', resumeLabel: 'Continue booking my counselling call' }
    return { was: `your question "${q}"`, resumeLabel: 'Continue where we left off' }
  }

  const onSend = useCallback((text: string) => {
    if (chat.answer(text)) return
    if (/\b(start (over|again|afresh|fresh|from scratch)|restart|reset|begin again|redo (the )?(journey|onboarding|questions))\b/i.test(text)) {
      chat.userSays(text)
      chat.run((bot) => restartFlow(bot, ctx))
      return
    }
    const target = askedFor(text, counsellorRef.current.prev)
    if (target && target !== counsellorRef.current.id) {
      chat.userSays(text)
      chat.run((bot) => switchFlow(bot, ctx, target))
      return
    }
    const prompt = chat.prompt
    chat.userSays(text)
    // Options are showing: a clear typed answer continues the flow straight away.
    if (prompt) {
      const local = matchTyped(text, prompt)
      if (local) { chat.pickTyped(local); return }
    }
    // Random letters: say so kindly and keep the question (never guess at a meaning that isn't there).
    if (looksLikeGibberish(text)) {
      chat.note(prompt
        ? `Sorry, I didn’t quite catch that, ${data.first}. Tap the option that fits you best below, or type your question in a few words.`
        : `Sorry, I didn’t quite catch that, ${data.first}. You can ask me things like “Which program fits me?”, “What could I earn after this?” or “How do the projects work?”`)
      return
    }
    const topic = topicRef.current ?? 'home'
    const context = contextOf(topic)
    // Something is in progress (a report being built, the test running): just answer, don't interrupt it.
    if (!prompt && chat.busy()) { void chat.ai({ message: text, context }).then((r) => ctx.showCard(r.show, r.programId)); return }
    // Otherwise the counsellor reads it in context: an answer in their own words, a question, a doubt or a change of plan.
    if (!chat.inDetour()) {
      counselRound.current = 0
      setAside.current = describeAside(topic, prompt ? prompt.question ?? '' : null)
    }
    const { was, resumeLabel } = setAside.current
    // The counsellor's own follow-up answers are not "answers" to map to: typing is a new message in the conversation.
    const answerable = prompt ? prompt.choices.filter((c) => !c.id.startsWith('c-say-')) : []
    // The options they didn't pick go away while the counsellor reads the message; they return only if still relevant.
    chat.stash()
    void chat.ai({
      message: text,
      context,
      pending: prompt && answerable.length ? { question: prompt.question ?? '', options: answerable.map((c) => ({ id: c.id, label: c.label })) } : undefined,
      counsel: { was, round: counselRound.current++ },
    }).then((r) => {
      if (r.failed) { chat.unstash(); return }
      ctx.showCard(r.show, r.programId)
      const found = prompt && r.choice ? prompt.choices.find((c) => c.id === r.choice) : undefined
      // Their own answer to a question that takes one ("Other"): keep their words, don't ask again.
      const chosen = found && prompt && found.id === prompt.other ? { ...found, text: otherAnswer(text, prompt)?.text ?? text.trim().slice(0, 60) } : found
      if (chosen && prompt) { chat.pickTyped(prompt.multi ? [chosen] : chosen); return }
      if (r.goNow && r.action) { ctx.go(r.action.href); return }
      // Not an answer: the stale options make way for a short counselling conversation, with a way back to them.
      chat.detour((bot, d) => counselFlow(bot, ctx, d, r, {
        context, was, resumeLabel,
        fallback: () => chat.run((b) => homeFlow(b, ctx, 'menu')),
        restart: (flow) => chat.run(flow),
        round: () => counselRound.current++,
      }))
    })
  }, [chat, ctx, data.first])

  const sameTopic = (href: string) => {
    const t = topicOf(href)
    if (t === topicOf(pathname) && t !== 'other') { startTopic.current(t, 'menu'); setDrawer(null) }
  }

  const done = {
    'skill-gap': tools['skill-gap']?.status === 'ready', salary: tools.salary?.status === 'ready', roadmap: tools.roadmap?.status === 'ready',
    eligibility: finished.eligibility || data.eligibilityDone, sessions: finished.sessions || data.hasSession,
  }
  const nextTool = TOOLS.find((t) => !done[t.id])?.id
  const who = getCounsellor(chat.who)
  threadRef.current = threadId

  // Away from the tab for 15 seconds: a chime, a blinking title and (if allowed) a desktop notification.
  useAwayAlert({
    enabled: true,
    title: () => `${getCounsellor(counsellorRef.current.id).name} is waiting for you`,
    body: () => `Come back to your Career Studio, ${data.first}: your plan is right where you left it.`,
  })

  // ---------- Woody, the guide ----------
  const guideHelp = (): GuideLine => ({
    text: `What can I help you with, ${data.first}?`,
    actions: [
      ...(data.eligibilityVisible && !done.eligibility ? [{ id: '/dashboard/eligibility', label: 'Check my eligibility · 2 min', icon: 'award' as IconName, primary: true }] : []),
      ...(!done.roadmap ? [{ id: '/dashboard/roadmap', label: 'Build my roadmap', icon: 'route' as IconName }] : []),
      done.sessions ? { id: '/dashboard/sessions', label: 'See my booked call', icon: 'calendar' as IconName } : { id: '/dashboard/sessions', label: 'Talk to a Senior Counsellor, free', icon: 'calendar' as IconName },
      { id: 'tour', label: 'Show me around', icon: 'target' as IconName },
      ...(canAskForNotifications() ? [{ id: 'notify', label: 'Alert me when my counsellor replies', icon: 'bell' as IconName }] : []),
      { id: 'how', label: 'How does this work?', icon: 'bulb' as IconName },
    ].slice(0, 6),
  })

  // ---------- Woody's tour: offered on the first visit, and any time from his menu ----------
  const tourKey = `lcn_tour:${data.userId}`
  const tourSeen = () => { try { return window.localStorage.getItem(tourKey) === '1' } catch { return true } }
  const markTour = () => { try { window.localStorage.setItem(tourKey, '1') } catch { /* ignore */ } }
  const [touring, setTouring] = useState(false)
  const tourSteps: TourStep[] = [
    { targets: ['chat'], icon: 'message', title: `Chat with ${who.name}`, text: `${who.name} is your counsellor. Ask anything here, or tap the options. Everything you share shapes your plan.` },
    { targets: ['reports', 'menu'], icon: 'chart', title: 'Your free reports', text: 'Skill Gap (with your readiness score), Salary Benchmark and Career Roadmap live here. Tap one and your counsellor builds it with you in the chat.' },
    { targets: ['skill-gap', 'menu'], icon: 'target', title: 'Readiness score & skill gaps', text: 'Start here: see how ready you are for your target role and exactly which skills to add first.' },
    ...(data.eligibilityVisible ? [{ targets: ['eligibility', 'menu'], icon: 'award' as IconName, title: 'Eligibility test · 2 minutes', text: '10 quick questions, no maths. It tells you if you qualify, and a Senior Counsellor can then check scholarships for you on the call.' }] : []),
    { targets: ['book'], icon: 'calendar', title: done.sessions ? 'Your booked call' : 'Book a free counselling call', text: done.sessions ? 'See or reschedule your call with a Learnbay Senior Career Counsellor here.' : 'Pick a time today or tomorrow for a free call with a Learnbay Senior Career Counsellor: your plan, fees and next steps.' },
    { targets: ['call'], icon: 'phone', title: 'Want a call sooner?', text: 'Tap Call me and a Senior Counsellor calls you at the earliest available time, within 1 working day (10 AM to 8 PM IST).' },
    { targets: ['plan', 'plan-btn'], icon: 'grid', title: 'Your plan at a glance', text: 'Your progress, readiness score, saved reports and the program recommended for you, always one tap away.' },
    { targets: ['profile'], icon: 'user', title: 'Your profile', text: 'Check or map your profile: role, industry, skills and goals. When your background changes, your plan follows.' },
    { targets: ['lumi'], icon: 'sparkles', title: 'I’m always here', text: `Tap me any time for help, a quick next step or this tour again. Enjoy it, ${data.first}!` },
  ]
  const startTour = () => { markTour(); guide.current?.close(); setDrawer(null); setTouring(true) }
  const guideHello = (): GuideLine => {
    if (tourSeen()) return { text: `Hi ${data.first}! I’m Woody, your guide here. I’m always in the corner, so tap me whenever you need help.` }
    // Offered once: whatever they choose (or if they close it), it isn't offered again; "Show me around" is in my menu.
    markTour()
    return {
        text: `Hi ${data.first}! I’m Woody, your guide in the Career Studio. Want a 30-second tour of where everything is: your reports, readiness score, the free counselling call and more?`,
        actions: [{ id: 'tour', label: 'Take the quick tour', icon: 'target', primary: true }, { id: 'tour-skip', label: 'I’ll explore on my own' }],
      }
  }
  const guideNudge = (why: 'back' | 'idle'): GuideLine | null => {
    const lines: string[] = []
    const actions: GuideLine['actions'] = []
    if (data.eligibilityVisible && !done.eligibility) {
      lines.push('Checking if you qualify takes just 2 minutes, no maths. Then a Senior Counsellor can check scholarships for you on the call.')
      actions.push({ id: '/dashboard/eligibility', label: 'Check my eligibility · 2 min', icon: 'award', primary: true })
    }
    if (!done.roadmap) {
      lines.push('Your roadmap isn’t built yet: the skills to learn, in order, and the projects to build.')
      actions.push({ id: '/dashboard/roadmap', label: 'Build my roadmap', icon: 'route' })
    }
    if (!lines.length && !done.sessions) {
      lines.push('A free call with a Senior Career Counsellor turns your reports into a real plan.')
      actions.push({ id: '/dashboard/sessions', label: 'Book my free 1:1', icon: 'calendar', primary: true })
    }
    if (why === 'idle') {
      // A gentle check-in, with the one most useful next step (not a "leaving" message).
      return {
        text: `Hey ${data.first}, are you still there? ${lines[0] ?? 'I’m right here whenever you want to continue.'}`,
        actions: [...actions.slice(0, 1), { id: 'later-close', label: 'I’m here, just reading' }],
      }
    }
    if (!lines.length) return null
    return { text: `Leaving already, ${data.first}? ${lines.join(' ')}`, actions: [...actions, { id: 'later', label: 'I’ll come back later' }] }
  }
  // ---------- feedback: asked by Woody after a few tasks, or at the end (never after a single task) ----------
  const tasksDone = [done['skill-gap'], done.salary, done.roadmap, done.eligibility, done.sessions].filter(Boolean).length
  const ratedKey = `lcn_rated:${data.userId}:${who.id}`
  const alreadyRated = () => { try { return window.localStorage.getItem(ratedKey) === '1' } catch { return false } }
  askRatingRef.current = async (why) => {
    if (alreadyRated() || !guide.current) return
    try { window.sessionStorage.setItem(`lcn_rating_asked:${data.userId}`, '1') } catch { /* ignore */ }
    const text = why === 'milestones'
      ? `Great progress, ${data.first}! You’ve done ${tasksDone} steps already. Mind rating your experience so far? It takes 10 seconds.`
      : `Before you go, ${data.first}: how was your time with ${who.name} today?`
    const sent = await guide.current.askRating({ counsellor: who.id, counsellorName: who.name, testTaken: done.eligibility, threadId }, text)
    if (sent) { try { window.localStorage.setItem(ratedKey, '1') } catch { /* ignore */ } }
  }
  // After a few tasks, once per visit, Woody asks (a short pause first, so it never interrupts a step).
  useEffect(() => {
    if (tasksDone < 3) return
    try { if (window.sessionStorage.getItem(`lcn_rating_asked:${data.userId}`) === '1') return } catch { return }
    const t = window.setTimeout(() => { void askRatingRef.current('milestones') }, 8000)
    return () => window.clearTimeout(t)
  }, [tasksDone])

  const onGuide = (id: string) => {
    if (id === 'tour') { startTour(); return }
    if (id === 'notify') {
      void askForNotifications().then((ok) => guide.current?.say({
        text: ok ? `Done! If you switch tabs, I’ll ping you when ${who.name} is waiting.` : 'No problem. You can turn notifications on later from your browser’s site settings.',
        autoCloseMs: 6000,
      }))
      return
    }
    if (id === 'tour-skip') {
      markTour()
      guide.current?.say({ text: 'Sure! Whenever you want the tour, just tap me and pick “Show me around”.', autoCloseMs: 6000 })
      return
    }
    if (id === 'later') {
      if (!alreadyRated() && tasksDone > 0) { void askRatingRef.current('leaving'); return }
      guide.current?.say({ text: `Thank you for your time, ${data.first}! Your plan and chat are saved, and we’re right here whenever you want to continue.`, autoCloseMs: 12000 })
      return
    }
    if (id === 'how') {
      guide.current?.say({
        text: `${who.name}, your counsellor, builds three free reports with you (skill gaps, salary, roadmap), then a 2-minute eligibility check, and a Senior Counsellor turns it into a plan on a free call.`,
        actions: guideHelp().actions?.filter((a) => a.id !== 'how'),
      })
      return
    }
    guide.current?.close()
    if (id === 'later-close') return
    setDrawer(null)
    ctx.go(id)
  }
  /** Log out: Woody says goodbye, and logging out happens only when the learner taps his Log out button. */
  const confirmLogout = async () => {
    if (!guide.current) return true
    const canRate = !alreadyRated() && tasksDone > 0
    const picked = await guide.current.choose({
      text: `Thank you for your time today, ${data.first}! Your plan, reports and chats are saved, so you can pick up right here next time.`,
      actions: [
        { id: 'logout', label: 'Log out', icon: 'logout', primary: true },
        ...(canRate ? [{ id: 'rate', label: `Rate ${who.name} first (10 seconds)`, icon: 'sparkles' as IconName }] : []),
        { id: 'stay', label: 'Stay a little longer' },
      ],
    })
    if (picked === 'rate') {
      await askRatingRef.current('leaving')
      await new Promise((r) => setTimeout(r, 1500))
      return true
    }
    return picked === 'logout'
  }

  const left = (
    <>
      <nav className="ts-nav" aria-label="Career Studio">
        <div data-tour="reports">
        <p className="ts-label">Your reports</p>
        {TOOLS.map((t) => (
          <NavItem key={t.id} tour={t.id} href={t.route} icon={t.icon} label={t.name} active={topicOf(pathname) === t.id} done={done[t.id]} dot={t.id === nextTool} onSame={sameTopic} />
        ))}
        </div>
        <p className="ts-label">Next steps</p>
        {data.eligibilityVisible && <NavItem tour="eligibility" href="/dashboard/eligibility" icon="award" label="Eligibility test" active={topicOf(pathname) === 'eligibility'} done={done.eligibility} onSame={sameTopic} />}
        <NavItem href="/dashboard/sessions" icon="calendar" label="Talk to a Senior Counsellor" active={topicOf(pathname) === 'sessions'} done={done.sessions} onSame={sameTopic} accent />
        <NavItem href="/dashboard/masterclasses" icon="play" label="Masterclasses" active={topicOf(pathname) === 'masterclasses'} onSame={sameTopic} />
      </nav>
      <div className="ts-foot">
        <button type="button" className="ts-lumi" onClick={() => { setDrawer(null); guide.current?.say(guideHelp()) }}>
          <Avatar who="bot" size={40} online />
          <span><b>Woody · your guide</b><small>Ask me anything</small></span>
          <Icon name="message" size="1rem" />
        </button>
        <div className="ts-foot-row">
          <Link href="/dashboard/help" className="ts-link" scroll={false}><Icon name="lifebuoy" size="1rem" /> Help</Link>
          <LogoutButton className="ts-link" showIcon confirm={confirmLogout} />
        </div>
      </div>
    </>
  )

  const right = (
    <StudioPanel counsellor={who.id} answers={answers} tools={tools} eligibilityDone={done.eligibility} eligibilityVisible={data.eligibilityVisible} sessionsDone={done.sessions} onNavigate={() => setDrawer(null)} />
  )

  const track = trackOf(answers.interest)
  return (
    <div className="ts-shell ts-3">
      <aside className="ts-side">
        <Logo href="/dashboard" />
        {left}
      </aside>
      <div className="ts-content">
        <header className="ts-head">
          <button type="button" className="ts-icon-btn ts-left-btn" data-tour="menu" aria-label="Open menu" onClick={() => setDrawer('left')}><Icon name="menu" size="1.2rem" /></button>
          <div className="ts-head-text">
            <h1><span className="ts-hi-long">Hi {data.first}, let’s plan your next move.</span><span className="ts-hi-short">Hi {data.first}, let’s plan.</span></h1>
            <p>{who.name} · {COUNSELLOR_TITLE}{track ? ` · ${track.label}` : ''}</p>
          </div>
          <div className="ts-head-right">
            <Link href="/dashboard/sessions" scroll={false} className="ts-pill" data-tour="book" onClick={() => sameTopic('/dashboard/sessions')}><Icon name="calendar" size="1rem" /> <span>{done.sessions ? 'My booked call' : 'Book counselling call'}</span></Link>
            <button type="button" className="ts-icon-btn ts-plan-btn" data-tour="plan-btn" aria-label="Your plan and reports" onClick={() => setDrawer('right')}><Icon name="grid" size="1.1rem" /></button>
            <Link href="/dashboard/profile" scroll={false} className="ts-avatar" data-tour="profile" aria-label="My profile">{initials(data.name)}</Link>
          </div>
        </header>
        <div className="ts-body">
          <main className="ts-main" data-tour="chat">
            <ChatWindow
              chat={chat}
              onSend={onSend}
              onCall={() => ctx.call('button')}
              onLink={(href) => sameTopic(href)}
              rating={ratings[who.id] ?? null}
              profile={(id, close) => (
                <CounsellorProfile id={id} interest={answers.interest} rating={ratings[id] ?? null} booked={done.sessions} onCall={() => ctx.call('button')} onClose={close} />
              )}
              headerRight={<button type="button" className="tc-newchat" onClick={() => void newChat()}><Icon name="plus" size="1rem" /> <span>New chat</span></button>}
            />
          </main>
          <aside className="ts-right" aria-label="Your plan" data-tour="plan">{right}</aside>
        </div>
      </div>
      {drawer && (
        <>
          <div className="ts-backdrop" onClick={() => setDrawer(null)} />
          <aside className={`ts-drawer ${drawer === 'right' ? 'right' : ''}`} role="dialog" aria-modal="true" aria-label={drawer === 'right' ? 'Your plan' : 'Menu'}>
            <div className="ts-drawer-top">{drawer === 'left' ? <Logo href="/dashboard" /> : <b>Your plan</b>}<button type="button" className="ts-menu-btn" aria-label="Close" onClick={() => setDrawer(null)}><Icon name="x" /></button></div>
            {drawer === 'left' ? left : right}
          </aside>
        </>
      )}
      <LumiGuide ref={guide} first={data.first} who={data.userId} hello={guideHello} help={guideHelp} nudge={guideNudge} quiet={() => touring} onAction={onGuide} />
      {touring && (
        <LumiTour
          steps={tourSteps}
          onEnd={(finished) => {
            setTouring(false)
            trackEvent('action', finished ? 'tour_finished' : 'tour_skipped')
            if (finished) guide.current?.say({ text: `That’s everything, ${data.first}! A good first step is your skill-gap report: it shows your readiness score in about a minute.`, actions: [{ id: '/dashboard/skill-gap', label: 'Check my skill gaps', icon: 'target', primary: true }, { id: 'later-close', label: 'I’ll chat first' }] })
          }}
        />
      )}
      {children}
    </div>
  )
}

function NavItem({ href, icon, label, active, done, dot, accent, onSame, tour }: { href: string; icon: IconName; label: string; active: boolean; done?: boolean; dot?: boolean; accent?: boolean; onSame: (href: string) => void; tour?: string }) {
  return (
    <Link href={href} scroll={false} data-tour={tour} aria-current={active ? 'page' : undefined} className={`ts-item ${accent ? 'accent' : ''}`} onClick={() => onSame(href)}>
      <span className="ts-item-icon"><Icon name={icon} size="1.05rem" /></span>
      <span className="ts-item-label">{label}</span>
      {done ? <Icon name="checkCircle" size="1rem" className="ts-done" label="Done" /> : dot ? <span className="ts-dot" aria-label="Recommended next" /> : null}
    </Link>
  )
}
