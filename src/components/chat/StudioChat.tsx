'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, type IconName } from '../Icon'
import { Logo } from '../Logo'
import { LogoutButton } from '../LogoutButton'
import { ChatWindow } from './ChatWindow'
import { matchTyped, useChat, type Bot, type Item, type ProjectItem } from './engine'
import { ADOPT_KEY, counselFlow, trackChangeFlow, eligibilityFlow, endFlow, homeFlow, masterclassFlow, restartFlow, sessionsFlow, switchFlow, toolFlow, type StudioCtx } from './flows'
import { StudioPanel } from './StudioPanel'
import { RichaGuide, type GuideHandle, type GuideLine } from './RichaGuide'
import { Avatar } from './Avatar'
import { skillFamily } from '@/lib/skills'
import { programForLearner } from '@/lib/segments'
import { clearGuestChat, getJson, postJson, sessionGet as storageGet, sessionSet as storageSet } from '@/lib/client'
import { COUNSELLOR_TITLE, askedFor, getCounsellor } from '@/lib/counsellors'
import { initials, trackOf, type Answers } from '@/lib/questions'
import type { ToolState } from '@/lib/report-card'
import { TOOLS, getTool, type ToolId } from '@/lib/tools-meta'

type Topic = 'home' | ToolId | 'eligibility' | 'sessions' | 'masterclasses' | 'other'
type Mode = 'first' | 'returning' | 'menu' | 'handover'
type Thread = { id: string; title: string; counsellor: string | null; updated_at: string }

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
  phoneMasked: string
}

function topicOf(path: string): Topic {
  const seg = path.split('/')[2] ?? ''
  if (!seg || seg === 'counselling') return 'home'
  if (seg === 'skill-gap' || seg === 'salary' || seg === 'roadmap' || seg === 'eligibility' || seg === 'sessions' || seg === 'masterclasses') return seg
  return 'other'
}
const contextOf = (t: Topic) => (t === 'home' || t === 'other' ? 'advisor' : t)

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function StudioChat({ data, children }: { data: StudioData; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const lastKey = `lcn_thread:${data.userId}`
  const [threads, setThreads] = useState<Thread[]>([])
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
  const [rating, setRating] = useState(data.counsellorRating)
  const guide = useRef<GuideHandle>(null)
  const askRatingRef = useRef<(why: 'end' | 'milestones' | 'leaving') => Promise<void>>(async () => {})
  const threadRef = useRef<string | null>(null)
  // A rating sent from the chat updates the stars on the counsellor's profile straight away.
  useEffect(() => {
    const on = (e: Event) => { const r = (e as CustomEvent).detail; if (r && typeof r.avg === 'number') setRating(r) }
    window.addEventListener('lcn:rated', on)
    return () => window.removeEventListener('lcn:rated', on)
  }, [])
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

  const startTopic = useRef<(t: Topic, mode: Mode) => void>(() => {})
  const pendingMode = useRef<Mode | null>(null)
  const quietThread = useRef<string | null>(null)
  const runKey = useRef('')
  const firstRun = useRef(true)
  const noThreadsAtStart = useRef(false)

  // ---------- threads ----------
  const createThread = useCallback(async () => {
    const r = await postJson('/api/chats', {})
    const id = r.ok ? String(r.data.id) : null
    if (id) {
      setThreads((list) => [{ id, title: 'New chat', counsellor: counsellorRef.current.id, updated_at: new Date().toISOString() }, ...list])
      storageSet(lastKey, id)
    }
    return id
  }, [lastKey])

  useEffect(() => {
    clearGuestChat(true)
    let cancelled = false
    ;(async () => {
      const r = await getJson('/api/chats')
      const list = r.ok ? ((r.data.threads as Thread[]) ?? []) : []
      if (cancelled) return
      setThreads(list)
      noThreadsAtStart.current = list.length === 0
      const wantNew = new URLSearchParams(window.location.search).has('new')
      const last = storageGet<string>(lastKey)
      // Only a refresh in the same tab continues a chat; every new visit starts a fresh one (old chats stay listed).
      let id = wantNew ? null : (list.find((t) => t.id === last)?.id ?? null)
      if (!id) id = await createThread()
      if (!cancelled && id) { storageSet(lastKey, id); setThreadId(id) }
      if (wantNew) router.replace(pathname, { scroll: false })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshThreads = useCallback(async () => {
    const r = await getJson('/api/chats')
    if (r.ok) setThreads((r.data.threads as Thread[]) ?? [])
  }, [])

  const newChat = useCallback(async () => {
    const id = await createThread()
    if (!id) return
    setDrawer(null)
    pendingMode.current = 'menu'
    setThreadId(id)
    if (topicOf(pathname) !== 'home') router.push('/dashboard', { scroll: false })
  }, [createThread, pathname, router])

  const openThread = (id: string) => {
    if (id === threadId) { setDrawer(null); return }
    quietThread.current = id
    storageSet(lastKey, id)
    setDrawer(null)
    setThreadId(id)
  }

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
    showCard: (show?: string) => {
      const interest = answersRef.current.interest ?? 'ai'
      const programId = programForLearner(answersRef.current)?.id
      if (show === 'projects') void ctx.projects(programId).then((items) => chat.addStaticCard({ type: 'projects', interest, programId, items }))
      else if (show === 'program') chat.addStaticCard({ type: 'program', interest, programId })
      else if (show === 'proof') chat.addStaticCard({ type: 'proof' })
      else if (show === 'strengths') chat.addStaticCard({ type: 'usp', ids: ['mentors', 'projects', 'placement'], lead: 'How Learnbay helps' })
      else if (show === 'compare') chat.addStaticCard({ type: 'why', interest, programId })
      else if (show === 'curriculum') chat.addStaticCard({ type: 'curriculum', interest, programId })
      else if (show === 'refund') chat.addStaticCard({ type: 'refund' })
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
    switchTrack: async (interest: string) => {
      const r = await postJson('/api/profile/track', { interest })
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

  startTopic.current = (t, mode) => {
    const flows: Record<Exclude<Topic, 'other'>, (bot: Bot) => Promise<void>> = {
      home: (bot) => homeFlow(bot, ctx, mode),
      'skill-gap': (bot) => toolFlow(bot, ctx, 'skill-gap'),
      salary: (bot) => toolFlow(bot, ctx, 'salary'),
      roadmap: (bot) => toolFlow(bot, ctx, 'roadmap'),
      eligibility: (bot) => eligibilityFlow(bot, ctx),
      sessions: (bot) => sessionsFlow(bot, ctx),
      masterclasses: (bot) => masterclassFlow(bot, ctx),
    }
    if (t !== 'other') chat.run(flows[t])
  }

  // Opening a chat or a topic starts the right conversation. An older chat opened from the list is shown as it was.
  // Moving to another page closes the mobile drawers (only then: this must not run on every render of the chat).
  useEffect(() => { setDrawer(null) }, [pathname])
  useEffect(() => {
    if (!chat.restored || !threadId) return
    const t = topicOf(pathname)
    if (t === 'other') return
    const key = `${threadId}|${t}`
    if (key === runKey.current) return
    const threadChanged = !runKey.current.startsWith(`${threadId}|`)
    const prevTopic = runKey.current.split('|')[1]
    runKey.current = key
    // Opening another section (eligibility, salary, a mentor call…) starts a fresh chat for it; the one before
    // stays in "Your chats". A chat the learner hasn't said anything in yet is simply reused.
    if (!threadChanged && !firstRun.current && prevTopic && prevTopic !== t && chat.items.some((i) => i.kind === 'user')) {
      topicRef.current = t
      chat.run(async () => {})
      void createThread().then((id) => {
        if (id) { pendingMode.current = 'menu'; setThreadId(id) } else startTopic.current(t, 'menu')
      })
      return
    }
    topicRef.current = t
    if (threadChanged && quietThread.current === threadId) { quietThread.current = null; return }
    let mode: Mode = pendingMode.current ?? 'menu'
    pendingMode.current = null
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
    if (wanted && t === 'home' && wanted.interest !== answersRef.current.interest) {
      chat.run((bot) => trackChangeFlow(bot, ctx, wanted.interest))
    } else {
      startTopic.current(t, t === 'home' ? mode : 'menu')
    }
    void refreshThreads()
  }, [pathname, chat, chat.restored, threadId, data.firstTime, data.counsellor, refreshThreads, createThread])

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
    if (topic === 'sessions') return { was: 'booking a mentor call', resumeLabel: 'Continue booking my mentor call' }
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
    const topic = topicRef.current ?? 'home'
    const context = contextOf(topic)
    // Something is in progress (a report being built, the test running): just answer, don't interrupt it.
    if (!prompt && chat.busy()) { void chat.ai({ message: text, context }).then((r) => ctx.showCard(r.show)); return }
    // Otherwise the counsellor reads it in context: an answer in their own words, a question, a doubt or a change of plan.
    if (!chat.inDetour()) {
      counselRound.current = 0
      setAside.current = describeAside(topic, prompt ? prompt.question ?? '' : null)
    }
    const { was, resumeLabel } = setAside.current
    // The counsellor's own follow-up answers are not "answers" to map to: typing is a new message in the conversation.
    const answerable = prompt ? prompt.choices.filter((c) => !c.id.startsWith('c-say-')) : []
    void chat.ai({
      message: text,
      context,
      pending: prompt && answerable.length ? { question: prompt.question ?? '', options: answerable.map((c) => ({ id: c.id, label: c.label })) } : undefined,
      counsel: { was, round: counselRound.current++ },
    }).then((r) => {
      ctx.showCard(r.show)
      const chosen = prompt && r.choice ? prompt.choices.find((c) => c.id === r.choice) : undefined
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
  }, [chat, ctx])

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

  // ---------- Richa, the guide ----------
  const guideHelp = (): GuideLine => ({
    text: `What can I help you with, ${data.first}?`,
    actions: [
      ...(data.eligibilityVisible && !done.eligibility ? [{ id: '/dashboard/eligibility', label: 'Check my eligibility · 2 min', icon: 'award' as IconName, primary: true }] : []),
      ...(!done.roadmap ? [{ id: '/dashboard/roadmap', label: 'Build my roadmap', icon: 'route' as IconName }] : []),
      { id: '/dashboard/sessions', label: 'Talk to a mentor, free', icon: 'calendar' as IconName },
      { id: 'how', label: 'How does this work?', icon: 'bulb' as IconName },
    ].slice(0, 4),
  })
  const guideNudge = (): GuideLine | null => {
    const lines: string[] = []
    const actions: GuideLine['actions'] = []
    if (data.eligibilityVisible && !done.eligibility) {
      lines.push('Checking if you qualify takes just 2 minutes, no maths. Then a mentor can check scholarships for you on the call.')
      actions.push({ id: '/dashboard/eligibility', label: 'Check my eligibility · 2 min', icon: 'award', primary: true })
    }
    if (!done.roadmap) {
      lines.push('Your roadmap isn’t built yet: the skills to learn, in order, and the projects to build.')
      actions.push({ id: '/dashboard/roadmap', label: 'Build my roadmap', icon: 'route' })
    }
    if (!lines.length && !done.sessions) {
      lines.push('A free 1:1 with a mentor turns your reports into a real plan.')
      actions.push({ id: '/dashboard/sessions', label: 'Book my free 1:1', icon: 'calendar', primary: true })
    }
    if (!lines.length) return null
    return { text: `Leaving already, ${data.first}? ${lines.join(' ')}`, actions: [...actions, { id: 'later', label: 'I’ll come back later' }] }
  }
  // ---------- feedback: asked by Richa after a few tasks, or at the end (never after a single task) ----------
  const tasksDone = [done['skill-gap'], done.salary, done.roadmap, done.eligibility, done.sessions].filter(Boolean).length
  const ratedKey = `lcn_rated:${data.userId}:${who.id}`
  const alreadyRated = () => { try { return window.localStorage.getItem(ratedKey) === '1' } catch { return false } }
  askRatingRef.current = async (why) => {
    if (alreadyRated() || !guide.current) return
    try { window.sessionStorage.setItem('lcn_rating_asked', '1') } catch { /* ignore */ }
    const text = why === 'milestones'
      ? `Great progress, ${data.first}! You’ve done ${tasksDone} steps already. Mind rating your experience so far? It takes 10 seconds.`
      : `Before you go, ${data.first}: how was your time with ${who.name} today?`
    const sent = await guide.current.askRating({ counsellor: who.id, counsellorName: who.name, testTaken: done.eligibility, threadId }, text)
    if (sent) { try { window.localStorage.setItem(ratedKey, '1') } catch { /* ignore */ } }
  }
  // After a few tasks, once per visit, Richa asks (a short pause first, so it never interrupts a step).
  useEffect(() => {
    if (tasksDone < 3) return
    try { if (window.sessionStorage.getItem('lcn_rating_asked') === '1') return } catch { return }
    const t = window.setTimeout(() => { void askRatingRef.current('milestones') }, 8000)
    return () => window.clearTimeout(t)
  }, [tasksDone])

  const onGuide = (id: string) => {
    if (id === 'later') {
      if (!alreadyRated() && tasksDone > 0) { void askRatingRef.current('leaving'); return }
      guide.current?.say({ text: `Thank you for your time, ${data.first}! Your plan and chat are saved, and we’re right here whenever you want to continue.`, autoCloseMs: 12000 })
      return
    }
    if (id === 'how') {
      guide.current?.say({
        text: `${who.name}, your counsellor, builds three free reports with you (skill gaps, salary, roadmap), then a 2-minute eligibility check, and a mentor turns it into a plan on a free call.`,
        actions: guideHelp().actions?.filter((a) => a.id !== 'how'),
      })
      return
    }
    guide.current?.close()
    setDrawer(null)
    ctx.go(id)
  }
  const sayGoodbye = async () => {
    guide.current?.say({ text: `Thank you for your time, ${data.first}! We’re right here whenever you want to continue.` })
    await new Promise((r) => setTimeout(r, 1200))
  }

  const left = (
    <>
      <nav className="ts-nav" aria-label="Career Studio">
        <p className="ts-label">Your reports</p>
        {TOOLS.map((t) => (
          <NavItem key={t.id} href={t.route} icon={t.icon} label={t.name} active={topicOf(pathname) === t.id} done={done[t.id]} dot={t.id === nextTool} onSame={sameTopic} />
        ))}
        <p className="ts-label">Next steps</p>
        {data.eligibilityVisible && <NavItem href="/dashboard/eligibility" icon="award" label="Eligibility test" active={topicOf(pathname) === 'eligibility'} done={done.eligibility} onSame={sameTopic} />}
        <NavItem href="/dashboard/sessions" icon="calendar" label="Talk to a mentor" active={topicOf(pathname) === 'sessions'} done={done.sessions} onSame={sameTopic} accent />
        <NavItem href="/dashboard/masterclasses" icon="play" label="Masterclasses" active={topicOf(pathname) === 'masterclasses'} onSame={sameTopic} />
      </nav>
      <div className="ts-foot">
        <button type="button" className="ts-richa" onClick={() => { setDrawer(null); guide.current?.say(guideHelp()) }}>
          <Avatar who="bot" size={40} online />
          <span><b>Richa · your guide</b><small>Ask me anything</small></span>
          <Icon name="message" size="1rem" />
        </button>
        <div className="ts-foot-row">
          <Link href="/dashboard/help" className="ts-link" scroll={false}><Icon name="lifebuoy" size="1rem" /> Help</Link>
          <LogoutButton className="ts-link" showIcon before={sayGoodbye} />
        </div>
      </div>
    </>
  )

  const right = (
    <StudioPanel counsellor={who.id} rating={who.id === data.counsellor.id ? rating : null} answers={answers} tools={tools} eligibilityDone={done.eligibility} eligibilityVisible={data.eligibilityVisible} onCall={() => ctx.call('button')} onNavigate={() => setDrawer(null)} />
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
          <button type="button" className="ts-icon-btn ts-left-btn" aria-label="Open menu" onClick={() => setDrawer('left')}><Icon name="menu" size="1.2rem" /></button>
          <div className="ts-head-text">
            <h1>Hi {data.first}, let’s plan your next move.</h1>
            <p>{who.name} · {COUNSELLOR_TITLE}{track ? ` · ${track.label}` : ''}</p>
          </div>
          <div className="ts-head-right">
            <Link href="/dashboard/sessions" scroll={false} className="ts-pill" onClick={() => sameTopic('/dashboard/sessions')}><Icon name="calendar" size="1rem" /> <span>Book mentor session</span></Link>
            <button type="button" className="ts-icon-btn ts-plan-btn" aria-label="Your plan and reports" onClick={() => setDrawer('right')}><Icon name="grid" size="1.1rem" /></button>
            <Link href="/dashboard/profile" scroll={false} className="ts-avatar" aria-label="My profile">{initials(data.name)}</Link>
          </div>
        </header>
        <div className="ts-body">
          <main className="ts-main">
            <ChatWindow
              chat={chat}
              onSend={onSend}
              onCall={() => ctx.call('button')}
              onLink={(href) => sameTopic(href)}
              headerRight={<button type="button" className="tc-newchat" onClick={() => void newChat()}><Icon name="plus" size="1rem" /> <span>New chat</span></button>}
            />
          </main>
          <aside className="ts-right" aria-label="Your plan">{right}</aside>
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
      <RichaGuide ref={guide} first={data.first} help={guideHelp} nudge={guideNudge} onAction={onGuide} />
      {children}
    </div>
  )
}

function NavItem({ href, icon, label, active, done, dot, accent, onSame }: { href: string; icon: IconName; label: string; active: boolean; done?: boolean; dot?: boolean; accent?: boolean; onSame: (href: string) => void }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? 'page' : undefined} className={`ts-item ${accent ? 'accent' : ''}`} onClick={() => onSame(href)}>
      <span className="ts-item-icon"><Icon name={icon} size="1.05rem" /></span>
      <span className="ts-item-label">{label}</span>
      {done ? <Icon name="checkCircle" size="1rem" className="ts-done" label="Done" /> : dot ? <span className="ts-dot" aria-label="Recommended next" /> : null}
    </Link>
  )
}
