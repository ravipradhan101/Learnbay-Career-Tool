'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, type IconName } from '../Icon'
import { Logo } from '../Logo'
import { LogoutButton } from '../LogoutButton'
import { ChatWindow } from './ChatWindow'
import { matchTyped, useChat, type Bot, type Item } from './engine'
import { ADOPT_KEY, counselFlow, eligibilityFlow, endFlow, homeFlow, masterclassFlow, restartFlow, sessionsFlow, switchFlow, toolFlow, type StudioCtx } from './flows'
import { StudioPanel } from './StudioPanel'
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
  const chat = useChat({ storageKey: null, signedIn: true, speaker: data.counsellor.id, threadId })
  const counsellorRef = useRef({ id: data.counsellor.id, prev: data.counsellor.prev })
  const [tools, setTools] = useState(data.tools)
  const [answers, setAnswers] = useState<Answers>({ ...data.answers })
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
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
    showCard: (show?: string) => {
      const interest = answersRef.current.interest ?? 'ai'
      if (show === 'projects') chat.addStaticCard({ type: 'projects', interest })
      else if (show === 'program') chat.addStaticCard({ type: 'program', interest })
      else if (show === 'proof') chat.addStaticCard({ type: 'proof' })
      else if (show === 'strengths') chat.addStaticCard({ type: 'usp', ids: ['mentors', 'projects', 'placement'], lead: 'How Learnbay helps' })
      else if (show === 'compare') chat.addStaticCard({ type: 'why', interest })
      else if (show === 'curriculum') chat.addStaticCard({ type: 'curriculum', interest })
      else if (show === 'refund') chat.addStaticCard({ type: 'refund' })
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
    runKey.current = key
    topicRef.current = t
    if (threadChanged && quietThread.current === threadId) { quietThread.current = null; return }
    let mode: Mode = pendingMode.current ?? 'menu'
    pendingMode.current = null
    if (firstRun.current) {
      firstRun.current = false
      // The conversation with Richa continues here after sign-up.
      try {
        const raw = window.sessionStorage.getItem(ADOPT_KEY)
        if (raw) {
          const earlier = (JSON.parse(raw) as { items?: Item[] }).items ?? []
          window.sessionStorage.removeItem(ADOPT_KEY)
          if (earlier.length && chat.items.length === 0) chat.adopt(earlier)
        }
      } catch { /* ignore */ }
      const c = data.counsellor
      if (c.isNew) chat.event(`${getCounsellor(c.id).name} joined the chat`, 'join')
      mode = noThreadsAtStart.current || data.firstTime ? 'first' : c.isNew && c.prev ? 'handover' : 'returning'
    }
    startTopic.current(t, t === 'home' ? mode : 'menu')
    void refreshThreads()
  }, [pathname, chat, chat.restored, threadId, data.firstTime, data.counsellor, refreshThreads])

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

  const left = (
    <>
      <nav className="ts-nav" aria-label="Career Studio">
        <NavItem href="/dashboard" icon="message" label={`Chat with ${who.name}`} active={topicOf(pathname) === 'home'} onSame={sameTopic} />
        <p className="ts-label">Your reports</p>
        {TOOLS.map((t) => (
          <NavItem key={t.id} href={t.route} icon={t.icon} label={t.name} active={topicOf(pathname) === t.id} done={done[t.id]} dot={t.id === nextTool} onSame={sameTopic} />
        ))}
        <p className="ts-label">Next steps</p>
        {data.eligibilityVisible && <NavItem href="/dashboard/eligibility" icon="award" label="Eligibility test" active={topicOf(pathname) === 'eligibility'} done={done.eligibility} onSame={sameTopic} />}
        <NavItem href="/dashboard/sessions" icon="calendar" label="Talk to a mentor" active={topicOf(pathname) === 'sessions'} done={done.sessions} onSame={sameTopic} accent />
        <NavItem href="/dashboard/masterclasses" icon="play" label="Masterclasses" active={topicOf(pathname) === 'masterclasses'} onSame={sameTopic} />
      </nav>
      {threads.length > 0 && (
        <div className="ts-threads">
          <p className="ts-label">Your chats</p>
          <ul>
            {threads.slice(0, 12).map((t) => (
              <li key={t.id}>
                <button type="button" className={`ts-thread ${t.id === threadId ? 'on' : ''}`} onClick={() => openThread(t.id)} aria-current={t.id === threadId ? 'true' : undefined}>
                  <span className="ts-thread-title">{t.title}</span>
                  <span className="ts-thread-time">{ago(t.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="ts-foot">
        <Link href="/dashboard/profile" className="ts-me" scroll={false}>
          <span className="ts-initials" aria-hidden="true">{initials(data.name)}</span>
          <span><b>{data.name}</b><small>My profile</small></span>
        </Link>
        <div className="ts-foot-row">
          <button type="button" className="ts-link" onClick={() => { setDrawer(null); chat.run((bot) => endFlow(bot, ctx)) }}><Icon name="x" size="1rem" /> End chat</button>
          <Link href="/dashboard/help" className="ts-link" scroll={false}><Icon name="lifebuoy" size="1rem" /> Help</Link>
          <LogoutButton className="ts-link" showIcon />
        </div>
      </div>
    </>
  )

  const right = (
    <StudioPanel counsellor={who.id} answers={answers} tools={tools} eligibilityDone={done.eligibility} eligibilityVisible={data.eligibilityVisible} onCall={() => ctx.call('button')} onNavigate={() => setDrawer(null)} />
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
