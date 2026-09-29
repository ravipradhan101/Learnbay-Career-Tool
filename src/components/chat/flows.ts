'use client'

// What Richa (the guide) and the counsellor say and ask, step by step. Scripted parts cost nothing and never go
// off-script; the counsellor's own words (from the model) come in where something personal is needed.
//
// The counsellor's first conversation follows a consultative sales flow:
// profiling → probing (current role, already learning?, biggest difficulty, time) → need generation →
// skill-gap report → solution (program) → proof (alumni, certification) → projects → next step (call / 1:1 / test).

import type { IconName } from '../Icon'
import type { AiResult, Bot, Choice, Detour, EligCompleted, EligInProgress, ProjectItem } from './engine'
import type { UspId } from '@/config/usps'
import { track } from '@/lib/analytics'
import { getJson, postJson, sessionGet as storageGet, sessionRemove as storageRemove, sessionSet as storageSet } from '@/lib/client'
import { getCounsellor } from '@/lib/counsellors'
import type { TestState } from '@/lib/eligibility'
import {
  CITIES, CLOUD_ROLES, COMPANY_TYPES, CTC_BANDS, DIFFICULTIES, DOMAINS, EDU_LEVELS, EXPERIENCE, GOALS, INTERESTS, LEARNING_SOURCES, PROGRAMMER, ROLES, ROLE_OTHER, SKILLS,
  SKILL_NONE, TARGET_NOT_SURE, TIMELINES, TRACK_TARGET, WEEKLY_HOURS, isAnswered, labelOf, targetRoleOptions, trackOf, type Answers, type ToolQuestionKey,
} from '@/lib/questions'
import type { ReportCard, ToolState } from '@/lib/report-card'
import { QUESTION_TITLES, TOOLS, getTool, type ToolId } from '@/lib/tools-meta'
import { getProgram } from '@/config/programs'
import { skillsFor } from '@/lib/skills'
import { payNote, rolesFor } from '@/lib/roles'
import { fitComparison, fitFor } from '@/lib/fit'
import { bridgeFor } from '@/lib/bridge'
import { DIFFICULTIES_FOR, PROBES, STUDY_STAGES, inferredProgrammer, inferredRole, programForLearner, segmentOf, triggersFor } from '@/lib/segments'

export const GUEST_ITEMS_KEY = 'lcn_chat_v2:guest'
export const GUEST_ANSWERS_KEY = 'lcn_chat_guest_answers_v2'
const GUEST_NAME_KEY = 'lcn_chat_guest_name'
/** The conversation with Richa, handed over to the signed-in chat so the story continues. */
export const ADOPT_KEY = 'lcn_chat_adopt'
/** A question typed before sign-up; the counsellor answers it right after. */
export const PENDING_Q_KEY = 'lcn_chat_pending_q'

const GOAL_ICONS: Record<string, IconName> = { switch: 'route', upskill: 'trend', salary: 'rupee', start: 'award', explore: 'target' }
const ROLE_ICONS: Record<string, IconName> = {
  'software-engineer': 'code', 'qa-engineer': 'bug', 'data-analyst': 'database', 'devops-cloud': 'cloud',
  'product-manager': 'cube', 'business-non-tech': 'users', student: 'award',
  'network-admin': 'cloud', sysadmin: 'grid', 'it-support': 'lifebuoy', dba: 'database',
}
const PROGRAMMER_ICONS: Record<string, IconName> = { yes: 'code', some: 'file', no: 'users' }
const LEARNING_ICONS: Record<string, IconName> = { free: 'play', paid: 'book', stopped: 'clock', none: 'plus' }
const TRIGGER_ICONS: Record<string, IconName> = {
  appraisal: 'rupee', 'job-worry': 'alert', 'ai-at-work': 'sparkles', stuck: 'route', exploring: 'target',
  'job-hunt': 'briefcase', 'no-calls': 'mail', peers: 'users',
}
/** A short, human reply to their reason for looking now. */
const TRIGGER_REPLY: Record<string, string> = {
  appraisal: 'Good timing. New skills change what you can ask for.',
  'job-worry': 'That’s a real concern for many people right now. Let’s make you harder to replace.',
  'ai-at-work': 'Then you’re early, and that’s the best time to move.',
  stuck: 'That usually means you’ve outgrown the role. Let’s find the way forward.',
  exploring: 'Perfect, no pressure. We’ll see where you fit best.',
  'job-hunt': 'Great, let’s make sure you stand out when you apply.',
  'no-calls': 'That’s frustrating, and very fixable. It usually comes down to proof on your CV.',
  peers: 'That feeling is common. Let’s get you moving too.',
}
const DIFFICULTY_ICONS: Record<string, IconName> = { roadmap: 'route', time: 'clock', concepts: 'bulb', projects: 'folder', interviews: 'briefcase', fit: 'target' }

/** Lower-cases the first letter for mid-sentence use, but leaves acronyms (IT, AI, SQL) alone. */
const lower = (s: string | undefined) => (!s ? '' : s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Z]/.test(s[1]) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? ''

// ================= Before sign-up: Richa, the career guide =================

export type GuestCtx = {
  signedIn: { name: string; email: string; phoneCountry: string; phone: string } | null
  initial: Answers
  fresh: boolean
  /** The track picked on the start screen (a program area id). */
  track: string | null
}

function captureSource() {
  try {
    if (window.sessionStorage.getItem('lcn_source')) return
    const params = new URLSearchParams(window.location.search)
    const src: Record<string, string> = {}
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = params.get(key)
      if (v) src[key] = v.slice(0, 200)
    }
    if (document.referrer) src.referrer = document.referrer.slice(0, 200)
    src.landing = window.location.pathname
    window.sessionStorage.setItem('lcn_source', JSON.stringify(src))
  } catch {
    // ignore
  }
}

const GOAL_REPLY: Record<string, string> = {
  switch: 'A switch goes much faster with the right plan and the right person guiding it.',
  upskill: 'The fastest growth usually comes from adding the right skills to the job you already know.',
  salary: 'A strong hike is very doable when your skills match what companies are paying for right now.',
  start: 'Starting right matters more than starting fast, and we’ll make sure you start right.',
  explore: 'Good place to start. We’ll show you where you fit, with no pressure.',
}

/** Richa: name, goal, industry and experience, then sign-up, then she finds the right counsellor. */
export async function guestFlow(bot: Bot, ctx: GuestCtx): Promise<void> {
  captureSource()
  const a: Answers = { ...(storageGet<Answers>(GUEST_ANSWERS_KEY) ?? {}), ...ctx.initial }
  if (ctx.track && !ctx.initial.interest) a.interest = ctx.track
  // Picking a track already says which role they are aiming for.
  if (a.interest && !a.targetRole && TRACK_TARGET[a.interest]) a.targetRole = TRACK_TARGET[a.interest]
  const save = () => storageSet(GUEST_ANSWERS_KEY, a)
  save()
  const step = (name: string) => track('step_view', `onboarding:${name}`)
  const t = trackOf(a.interest)
  let name = ctx.signedIn?.name || storageGet<string>(GUEST_NAME_KEY) || ''

  if (ctx.fresh) {
    await bot.say(`Hi, I’m Richa, your career guide at Learnbay.${t ? ` Great choice: the ${t.label} (${t.hint}).` : ''}`)
  }
  if (!name) {
    step('name')
    await bot.say('Let’s start with you. What’s your first name? Just type it in the box below.')
    for (;;) {
      name = (await bot.ask({ placeholder: 'Type your first name, e.g. Priya', label: 'Your first name', maxLength: 60 })).replace(/[<>]/g, '').trim()
      if (name.length >= 2) break
      await bot.say('Please type your first name in the box below, e.g. Priya.')
    }
    storageSet(GUEST_NAME_KEY, name)
    track('step_answer', 'onboarding:name')
  }
  const first = firstOf(name)
  if (!a.goal) {
    step('goal')
    await bot.say(`Lovely to meet you, ${first}! What’s your main career goal right now?`)
    const c = await bot.choose([
      ...GOALS.map((g) => ({ ...g, icon: GOAL_ICONS[g.id] })),
      ...(ctx.signedIn ? [] : [{ id: 'login', label: 'I have an account · Log in', icon: 'user' as IconName }]),
    ])
    if (c.id === 'login') return loginFlow(bot, ctx)
    a.goal = c.id; save()
    track('step_answer', 'onboarding:goal', { value: c.id })
    await bot.say(GOAL_REPLY[c.id] ?? 'Great.')
  }
  if (!a.domain) {
    step('domain')
    await bot.say(`Which industry or domain do you work in, ${first}?`)
    const c = await bot.choose(DOMAINS, { style: 'chips' })
    a.domain = c.id; save()
    track('step_answer', 'onboarding:domain', { value: c.id })
  }
  if (!a.experience) {
    step('experience')
    await bot.say('And how many years of experience do you have?')
    const c = await bot.choose(EXPERIENCE, { style: 'chips' })
    a.experience = c.id; save()
    track('step_answer', 'onboarding:experience', { value: c.id })
  }
  if ((a.experience === '0' || a.domain === 'student') && !a.studyStage) {
    step('studyStage')
    await bot.say('Are you in your final year, or have you graduated?')
    const c = await bot.choose(STUDY_STAGES)
    a.studyStage = c.id; save()
    track('step_answer', 'onboarding:studyStage', { value: c.id })
  }
  const exp = labelOf(EXPERIENCE, a.experience) ?? ''
  const dom = labelOf(DOMAINS, a.domain) ?? ''
  await bot.say(`Got it: ${exp === 'Fresher' ? 'starting out' : `${exp} of experience`}${dom && a.domain !== 'other' ? ` in ${lower(dom)}` : ''}, and you want to ${lower(labelOf(GOALS, a.goal))}.${t ? ` Our ${t.label} counsellors guide people with exactly this profile.` : ''}`)

  step('contact')
  await bot.say(ctx.signedIn ? 'Just confirm your details and I’ll find your counsellor.' : 'Where should we send your plan? I’ll email you a quick code to keep your account safe.')
  const saved = await bot.live<{ email?: string; existing?: boolean; redirect?: string; contact?: object }>({ type: 'contact', answers: a, prefill: ctx.signedIn ?? { name, email: '', phoneCountry: '+91', phone: '' } })
  let returning = false
  if (saved.email) {
    await bot.say(saved.existing ? `Welcome back, ${first}! Enter the code I just emailed you.` : `I sent a 6-digit code to ${saved.email}.`)
    const v = await bot.live<{ onboarded: boolean }>({ type: 'otp', email: saved.email, existing: Boolean(saved.existing) })
    if (saved.existing || !v.onboarded) {
      // An account that already exists keeps its saved profile and reports; today's answers only fill gaps.
      await postJson('/api/onboarding', { answers: a, contact: saved.contact })
    }
    returning = Boolean(saved.existing && v.onboarded)
  }
  await bot.say(returning ? `You’re in, ${first}! Your reports are all saved. Let me find the right counsellor for you…` : `You’re verified, ${first}. Let me find the best counsellor for you…`, { quick: true })
  await findCounsellor(bot, a.interest ?? 'ai')
  storageRemove(GUEST_ANSWERS_KEY)
  storageRemove(GUEST_NAME_KEY)
  // Richa's chat stays behind: the counsellor starts a clean conversation, knowing everything from the profile.
  try { window.sessionStorage.removeItem(GUEST_ITEMS_KEY); window.sessionStorage.removeItem(ADOPT_KEY) } catch { /* ignore */ }
  const dest = saved.redirect ?? '/dashboard'
  window.location.href = dest === '/dashboard' && a.interest ? `/dashboard?track=${a.interest}` : dest
}

/** The counsellor search (10-13 seconds of stories, projects and strengths), then who is joining. */
async function findCounsellor(bot: Bot, interest: string) {
  const m = await bot.live<{ id: string } | null>({ type: 'matching', track: interest })
  if (m?.id) {
    bot.card({ type: 'counsellor', id: m.id, track: interest })
    await bot.say(`${getCounsellor(m.id).name} is available now. Connecting you…`)
  }
}

/** Log in inside the chat: email, 6-digit code, then straight to the studio (or the quick questions if the profile is incomplete). */
export async function loginFlow(bot: Bot, ctx: GuestCtx): Promise<void> {
  track('step_view', 'login:chat')
  await bot.say('Welcome back! Enter the email you signed up with and I’ll send you a login code.')
  const r = await bot.live<{ email?: string; fresh?: boolean }>({ type: 'login' })
  if (r.fresh || !r.email) {
    await bot.say('No problem, let’s get you started.')
    return guestFlow(bot, { ...ctx, fresh: false })
  }
  await bot.say(`I sent a 6-digit code to ${r.email}. Can’t find it? Check Promotions or Spam.`)
  const v = await bot.live<{ onboarded: boolean }>({ type: 'otp', email: r.email, existing: true })
  if (v.onboarded) {
    await bot.say('You’re in! Your reports are all saved. Let me find the right counsellor for you…', { quick: true })
    await findCounsellor(bot, ctx.initial.interest ?? ctx.track ?? 'ai')
    try { window.sessionStorage.removeItem(GUEST_ITEMS_KEY); window.sessionStorage.removeItem(GUEST_ANSWERS_KEY) } catch { /* ignore */ }
    window.location.href = '/dashboard'
    return
  }
  await bot.say('You’re in. A few quick questions to finish your profile.', { quick: true })
  window.location.href = '/start'
}

// ================= Signed in: the counsellor =================

export type StudioCtx = {
  first: string
  answers: Answers
  tools: () => Record<ToolId, ToolState>
  setTool: (id: ToolId, state: ToolState) => void
  eligibilityVisible: boolean
  latestSession: { preferred_date: string | null; preferred_time: string | null; status: string } | null
  go: (href: string) => void
  userSays: (text: string) => void
  /** Steps finished outside the reports (updates the side panes straight away). */
  done: { eligibility: boolean; sessions: boolean }
  markDone: (step: 'eligibility' | 'sessions') => void
  /** The allocated counsellor, and the previous one (if the learner had another before). */
  counsellor: () => { id: string; prev: string | null }
  setCounsellor: (id: string, prev: string | null) => void
  /** Shows the "shall I call you now?" card. */
  call: (source: 'button' | 'chat') => void
  /** Saves profile answers and updates the side panes. */
  saveAnswers: (patch: Answers) => Promise<boolean>
  /** Starts a new, separate chat thread. */
  newChat: () => void
  /** A Learnbay card under the counsellor's answer (projects, program, proof, strengths, compare). */
  showCard: (show?: string) => void
  /** Four projects for this learner from the project library (a fresh rotation each time). */
  projects: (programId?: string) => Promise<ProjectItem[]>
  /** Moves the learner to another track (only after they approve it in the chat). */
  switchTrack: (interest: string) => Promise<boolean>
  /** Sets the program the learner approved in the chat. */
  switchProgram: (programId: string) => Promise<boolean>
  /** The chat being shown (reviews are one per chat). */
  threadId: () => string | null
  /** Richa's feedback pop-up (counsellor, eligibility test, suggestions); skipped if already given. */
  askRating: (why: 'end' | 'milestones' | 'leaving') => Promise<void>
}

const USPS_FOR: Record<ToolId, UspId[]> = {
  'skill-gap': ['customisation', 'projects'],
  salary: ['placement', 'domain'],
  roadmap: ['mentors', 'hybrid'],
}
/** The Learnbay strength that answers each difficulty (used in the counsellor's pitch). */
const USP_FOR_DIFFICULTY: Record<string, UspId[]> = {
  roadmap: ['customisation', 'mentors'],
  time: ['hybrid', 'mentors'],
  concepts: ['mentors', 'customisation'],
  projects: ['projects', 'domain'],
  interviews: ['placement', 'projects'],
  fit: ['customisation', 'domain'],
}

function ready(ctx: StudioCtx, id: ToolId) {
  return ctx.tools()[id]?.status === 'ready'
}
const probed = (ctx: StudioCtx) => Boolean(ctx.answers.difficulty)

/** The main things to do, the recommended one first. Each choice id is the route it opens. */
export function menu(ctx: StudioCtx): Choice[] {
  const labels: Record<ToolId, [string, string]> = {
    'skill-gap': ['Check my skill gaps', 'See my skill gaps'],
    salary: ['What could I earn?', 'See my salary benchmark'],
    roadmap: ['Build my roadmap', 'See my roadmap'],
  }
  const tools = TOOLS.map((t) => ({ id: t.route, label: labels[t.id][ready(ctx, t.id) ? 1 : 0], icon: t.icon, done: ready(ctx, t.id) }))
  const list: (Choice & { done?: boolean })[] = [...tools.filter((t) => !t.done), ...tools.filter((t) => t.done)]
  if (ctx.eligibilityVisible && !ctx.done.eligibility) list.unshift({ id: '/dashboard/eligibility', label: 'Check my eligibility · 2 min, no maths', icon: 'award' })
  list.push({ id: '/dashboard/sessions', label: ctx.done.sessions ? 'Book another mentor call' : 'Talk to a mentor, free', icon: 'calendar' })
  return list.map(({ id, label, icon }) => ({ id, label, icon }))
}

function progressLine(ctx: StudioCtx) {
  const done = TOOLS.filter((t) => ready(ctx, t.id)).length
  if (!done) return ctx.eligibilityVisible && !ctx.done.eligibility ? 'Let’s start with a 2-minute eligibility check, then your skill gaps.' : 'Shall we start with your skill gaps? It’s the quickest way to see where you stand.'
  if (done < TOOLS.length) return `You have ${done} of ${TOOLS.length} reports ready. Here’s what I’d look at next.`
  return 'All three reports are ready. The best next step is a free 1:1 with a mentor to turn them into a plan.'
}

export async function homeFlow(bot: Bot, ctx: StudioCtx, mode: 'first' | 'returning' | 'menu' | 'handover'): Promise<void> {
  // Until the counsellor has done their first conversation, that always comes first.
  if (!probed(ctx) && mode !== 'menu') return counsellorFirstFlow(bot, ctx)
  const me = getCounsellor(ctx.counsellor().id)
  const prev = ctx.counsellor().prev
  if (mode === 'handover' && prev) {
    await bot.say(`Hi ${ctx.first}, I’m ${me.name}, your career counsellor today. I’ve gone through everything you did with ${getCounsellor(prev).name}, so we’ll pick up right where you left off. ${progressLine(ctx)}`)
    const c = await bot.choose([...menu(ctx), { id: `switch:${prev}`, label: `Continue with ${getCounsellor(prev).name}`, icon: 'refresh' }])
    return ctx.go(c.id)
  }
  if (mode === 'returning' || mode === 'first') {
    await bot.say(`Welcome back, ${ctx.first}. ${progressLine(ctx)}`)
  } else {
    await bot.say(`What would you like to do next, ${ctx.first}? ${progressLine(ctx)}`)
  }
  const c = await bot.choose(menu(ctx))
  ctx.go(c.id)
}

const LEARNING_REPLY: Record<string, string> = {
  free: 'YouTube is a great way to start. Most people then hit the same wall: lots of videos, no clear order.',
  paid: 'Good that you’ve invested in yourself already. Recorded courses teach topics; the gap is usually structure and feedback.',
  stopped: 'That’s very common for working professionals. It’s rarely about ability, usually about structure and support.',
  none: 'That’s fine. Starting with a clear plan is the best way to begin.',
}

/**
 * The counsellor's first conversation: profiling and probing, need generation, then the skill-gap report,
 * followed by the solution, proof and projects (see toolFlow's `sales` step).
 */
export async function counsellorFirstFlow(bot: Bot, ctx: StudioCtx): Promise<void> {
  const me = getCounsellor(ctx.counsellor().id)
  const a = ctx.answers
  const t = trackOf(a.interest)
  const exp = labelOf(EXPERIENCE, a.experience)
  const dom = labelOf(DOMAINS, a.domain)
  const goal = labelOf(GOALS, a.goal)
  // Each answer is saved straight away, so coming back mid-way never asks the same thing twice.
  const keep = async (patch: Answers) => {
    if (!(await ctx.saveAnswers(patch))) throw new Error('save failed')
    bot.alive()
  }
  // Already introduced in this chat, or already answering: never repeat the introduction.
  // Already talking in this chat (e.g. after a track change): no second introduction.
  const introduced = bot.hasSaid((x) => x.startsWith(`Hi ${ctx.first}, I’m ${me.name}`) || x.includes(`It’s ${me.name}.`) || x.startsWith('Done, '))
  const started = Boolean(a.trigger || a.learning) || introduced
  if (started) {
    await bot.say(introduced && !a.trigger ? `Now let’s get to know you a little better, ${ctx.first}, so your plan fits exactly.` : `Welcome back, ${ctx.first}. Let’s pick up where we left off.`)
  } else {
    // Introduce themselves, then open with a personal read of the profile Richa collected.
    await bot.say(`Hi ${ctx.first}, I’m ${me.name}, a senior career counsellor at Learnbay.${t ? ` I specialise in the ${t.label} and guide people moving into roles like ${rolesFor(a).slice(0, 2).join(' and ')}.` : ''}`)
    await bot.say(`I’ve gone through what you shared with Richa${exp ? `: ${exp === 'Fresher' ? 'just starting out' : `${exp} of experience`}` : ''}${dom && a.domain !== 'other' ? ` in ${lower(dom)}` : ''}${goal ? `, aiming to ${lower(goal)}` : ''}. Here’s my first read.`)
    await bot.ai({ intent: 'analysis', context: 'advisor' })
  }
  const q = storageGet<string>(PENDING_Q_KEY)
  if (q) {
    storageRemove(PENDING_Q_KEY)
    await bot.say('First, you asked Richa something. Let me answer that.', { quick: true })
    ctx.userSays(q)
    await bot.ai({ message: q, context: 'advisor' })
  }
  if (!started) await bot.say('A few quick questions so my advice fits you exactly.')
  if (a.interest && !a.targetRole && TRACK_TARGET[a.interest]) await keep({ targetRole: TRACK_TARGET[a.interest] })
  const seg = segmentOf(ctx.answers)
  // 1. Why now: their own reason is the only urgency the counsellor ever uses.
  if (!ctx.answers.trigger) {
    await bot.say(seg === 'fresher' ? 'First, what’s got you thinking about this now?' : 'First, what made you start looking at this now?')
    const c = await bot.choose(triggersFor(seg).map((o) => ({ ...o, icon: TRIGGER_ICONS[o.id] })))
    await keep({ trigger: c.id })
    track('action', 'counsel:why_now', { value: c.id, segment: seg })
    await bot.say(TRIGGER_REPLY[c.id] ?? 'Thanks, that helps.')
  }
  // 2. Role and coding, only when their background doesn't already say it.
  if (!ctx.answers.role) {
    const role = inferredRole(ctx.answers)
    if (role) await keep({ role })
    else {
      await bot.say('What’s your current role?')
      const roles = ROLES.filter((r) => r.id !== 'student' && (ctx.answers.interest === 'cloud-devops' || !CLOUD_ROLES.includes(r.id)))
      const c = await bot.choose([...roles.map((r) => ({ ...r, icon: ROLE_ICONS[r.id] })), { id: ROLE_OTHER, label: 'Something else', icon: 'plus' as IconName }], { style: 'chips' })
      const patch: Answers = { role: c.id }
      if (c.id === ROLE_OTHER) {
        await bot.say('What’s your role called?')
        patch.roleOther = (await bot.ask({ placeholder: 'Type your role, e.g. Business Analyst', label: 'Your current role', maxLength: 60 })).slice(0, 60)
      }
      await keep(patch)
    }
  }
  if (!ctx.answers.programmer) {
    const coding = inferredProgrammer(ctx.answers)
    if (coding) await keep({ programmer: coding })
    else {
      await bot.say(seg === 'fresher' ? 'Do you code at all, in college or on your own?' : 'Do you write code in your work?')
      await keep({ programmer: (await bot.choose(PROGRAMMER.map((p) => ({ ...p, icon: PROGRAMMER_ICONS[p.id] })))).id })
    }
  }
  // 3. One question for their segment, to find the specific pain.
  if (!ctx.answers.probe) {
    const probe = PROBES[seg]
    await bot.say(probe.question)
    const c = await bot.choose(probe.options)
    await keep({ probe: c.id })
    track('action', 'counsel:probe', { value: c.id, segment: seg })
  }
  if (!ctx.answers.learning) {
    await bot.say(`Have you already tried learning this${t ? ` (${t.hint})` : ''}? On YouTube, Udemy or anywhere else?`)
    const learning = (await bot.choose(LEARNING_SOURCES.map((l) => ({ ...l, icon: LEARNING_ICONS[l.id] })))).id
    await keep({ learning })
    await bot.say(LEARNING_REPLY[learning] ?? 'Thanks for sharing.')
  }
  if (!ctx.answers.difficulty) {
    await bot.say('What’s been the hardest part so far?')
    const options = DIFFICULTIES.filter((d) => DIFFICULTIES_FOR[seg].includes(d.id))
    await keep({ difficulty: (await bot.choose(options.map((d) => ({ ...d, icon: DIFFICULTY_ICONS[d.id] })))).id })
  }
  track('action', 'counsellor_probing_done', { segment: seg, trigger: ctx.answers.trigger ?? '', difficulty: ctx.answers.difficulty ?? '' })
  // 4. Need: mirror their situation and what waiting costs, from their own answers; then check it lands.
  await bot.ai({ intent: 'need', context: 'advisor' })
  await bot.say('Does that sound like where you are?')
  const agreed = await bot.choose([{ id: 'yes', label: 'Yes, that’s me', icon: 'check' }, { id: 'partly', label: 'Partly', icon: 'message' }], { style: 'chips' })
  track('action', 'counsel:need_agreed', { value: agreed.id, segment: seg })
  if (agreed.id === 'partly') await bot.say('Fair enough. The report will show us exactly where you stand.')
  // 5. Their own target date: the deadline we plan to (never an invented one).
  if (!ctx.answers.timeline) {
    await bot.say(seg === 'fresher' ? 'When would you like to land your first tech role?' : 'When would you like to be in your new role?')
    await keep({ timeline: (await bot.choose(TIMELINES, { style: 'chips' })).id })
  }
  await bot.say('Let’s measure exactly where you stand. I’ll build your skill-gap report now.')
  return toolFlow(bot, ctx, 'skill-gap', true)
}

// ---------- Reports (skill gap, salary, roadmap) ----------

function choicesFor(key: ToolQuestionKey, a: Answers): Choice[] {
  if (key === 'targetRole') return [...targetRoleOptions(a), { id: TARGET_NOT_SURE, label: 'Not sure, suggest one' }]
  if (key === 'ctc') return CTC_BANDS
  if (key === 'city') return CITIES
  if (key === 'weeklyHours') return WEEKLY_HOURS
  if (key === 'timeline') return TIMELINES
  return [...SKILLS, { id: SKILL_NONE, label: 'None yet' }]
}

async function buildReport(bot: Bot, ctx: StudioCtx, tool: ToolId, alreadyRunning: boolean): Promise<ReportCard | null> {
  const meta = getTool(tool)!
  const gen = bot.card({ type: 'generating', tool })
  const started = Date.now()
  if (!alreadyRunning) track('action', 'tool_generate_start', { tool, from: 'chat' })
  let status = 'generating'
  if (!alreadyRunning) {
    const res = await postJson(`/api/tools/${tool}/generate`, {})
    bot.alive()
    if (!res.ok) {
      bot.remove(gen)
      track('error', 'tool_generate_failed', { tool, status: res.status })
      await bot.say(res.data.exhausted ? `${res.error}` : `I couldn’t build your ${meta.name} just now. ${res.error}`)
      return null
    }
    status = String(res.data.status)
  }
  const until = Date.now() + 4 * 60_000
  while (status === 'generating' && Date.now() < until) {
    await bot.wait(3000)
    const s = await getJson(`/api/tools/${tool}/status`)
    bot.alive()
    if (s.ok) status = String(s.data.status)
  }
  if (status !== 'ready') {
    bot.remove(gen)
    await bot.say('That took longer than it should. Let’s try again, it usually works the second time.')
    const c = await bot.choose([{ id: 'retry', label: 'Try again', icon: 'refresh' }, { id: '/dashboard/sessions', label: 'Talk to a mentor instead', icon: 'calendar' }], { style: 'chips' })
    if (c.id === 'retry') return buildReport(bot, ctx, tool, false)
    ctx.go(c.id)
    return null
  }
  const r = await getJson(`/api/tools/${tool}/result`)
  bot.alive()
  bot.remove(gen)
  const card = r.ok ? (r.data.card as ReportCard | null) : null
  if (!card) { await bot.say('Your report is ready, but I couldn’t load it. Please open the page again.'); return null }
  track('action', 'tool_ready', { tool, wait_ms: Date.now() - started, from: 'chat' })
  ctx.setTool(tool, { status: 'ready', card })
  return card
}

async function nextMoves(bot: Bot, ctx: StudioCtx, current: ToolId | 'eligibility' | 'sessions', withCall = false) {
  const opts: Choice[] = []
  if (ctx.eligibilityVisible && !ctx.done.eligibility && current !== 'eligibility') opts.push({ id: '/dashboard/eligibility', label: 'Check my eligibility · 2 min', icon: 'award' })
  if (withCall) opts.push({ id: 'call', label: 'Call me to discuss', icon: 'phone' })
  if (current !== 'sessions' && !ctx.done.sessions) opts.push({ id: '/dashboard/sessions', label: 'Book a free 1:1 with a mentor', icon: 'calendar' })
  for (const t of TOOLS) if (t.id !== current && !ready(ctx, t.id)) opts.push({ id: t.route, label: `Next: ${t.name}`, icon: t.icon })
  if (current === 'eligibility' && !withCall) opts.push({ id: 'call', label: 'Call me to discuss', icon: 'phone' })
  if (!opts.length) opts.push({ id: '/dashboard', label: 'What else can I do?', icon: 'message' })
  const c = await bot.choose(opts.slice(0, 4), { style: 'chips' })
  ctx.go(c.id)
}

/** Skills with a level for each one. */
async function askSkills(bot: Bot, ctx: StudioCtx, patch: Answers) {
  // One card: the tools and concepts their target role needs, each rated in place.
  const r = await bot.live<{ skills: string[]; levels: Record<string, string> }>({ type: 'skill-matrix', skills: skillsFor(ctx.answers).map((s) => ({ id: s.id, label: s.label })) })
  patch.skills = r.skills.length ? r.skills : [SKILL_NONE]
  if (Object.keys(r.levels).length) patch.skillLevels = r.levels
}

/**
 * One report. With `sales`, the report is followed by the pitch: the program that closes these gaps,
 * proof (alumni, certification) and the projects they would build, then a clear next step.
 */
export async function toolFlow(bot: Bot, ctx: StudioCtx, tool: ToolId, sales = false): Promise<void> {
  const meta = getTool(tool)!
  bot.divider(meta.name)
  const state = ctx.tools()[tool]
  if (state?.status === 'ready' && state.card) {
    await bot.say(`Here’s your ${meta.name}, ${ctx.first}. The big number first, then your next 3 moves.`)
    bot.card({ type: 'report', card: state.card })
    if (sales) return eligibilityPush(bot, ctx, tool, true)
    await bot.say('Ask me anything about it, or pick what’s next.')
    return nextMoves(bot, ctx, tool)
  }
  if (state?.status === 'generating') {
    await bot.say(`Your ${meta.name} is still being built. Give me a few seconds…`)
  } else {
    if (!sales) {
      await bot.say(meta.preview.promise)
      bot.card({ type: 'intro', tool })
    }
    // The track already says which role they are aiming for: never ask it again.
    const interest = ctx.answers.interest
    if (!ctx.answers.targetRole && interest && TRACK_TARGET[interest]) { await ctx.saveAnswers({ targetRole: TRACK_TARGET[interest] }); bot.alive() }
    const missing = meta.questions.filter((q) => !isAnswered(ctx.answers, q))
    if (!sales) {
      const go = await bot.choose([
        { id: 'go', label: missing.length ? `Let’s do it · ${missing.length} quick question${missing.length === 1 ? '' : 's'}` : `Build my ${meta.name}`, icon: 'arrowRight' },
        { id: 'later', label: 'Maybe later', icon: 'clock' },
      ])
      if (go.id === 'later') return homeFlow(bot, ctx, 'menu')
    }
    track('action', 'tool_intro_start', { tool, from: 'chat' })
    const patch: Answers = {}
    if (!ctx.answers.role) {
      await bot.say('First, what’s your current role?')
      patch.role = (await bot.choose(ROLES.filter((r) => ctx.answers.interest === 'cloud-devops' || !CLOUD_ROLES.includes(r.id)).map((r) => ({ ...r, icon: ROLE_ICONS[r.id] })), { style: 'chips' })).id
    }
    for (const key of missing) {
      track('step_view', `${tool}:${key}`)
      await bot.say(QUESTION_TITLES[key].title)
      if (key === 'skills') await askSkills(bot, ctx, patch)
      else {
        const c = await bot.choose(choicesFor(key, ctx.answers), { style: key === 'weeklyHours' ? 'rows' : 'chips' })
        ;(patch as Record<string, string>)[key] = c.id
      }
      track('step_answer', `${tool}:${key}`)
    }
    // High earners: the salary advice depends on the kind of company they're in.
    const ctc = patch.ctc ?? ctx.answers.ctc
    if (tool === 'salary' && ctc === 'gt50' && !ctx.answers.companyType) {
      await bot.say('At your level, the kind of company matters a lot. Where do you work today?')
      patch.companyType = (await bot.choose(COMPANY_TYPES, { style: 'chips' })).id
    }
    if (Object.keys(patch).length && !(await ctx.saveAnswers(patch))) { await bot.say('I couldn’t save that. Please try again.'); return }
    bot.alive()
    await bot.say('Perfect. Building it now, this takes about 30 seconds.')
  }
  const card = await buildReport(bot, ctx, tool, state?.status === 'generating')
  if (!card) return
  bot.card({ type: 'report', card })
  await bot.ai({ intent: 'report', context: tool })
  if (sales) return eligibilityPush(bot, ctx, tool, true)
  bot.card({ type: 'usp', ids: USPS_FOR[tool], lead: 'How Learnbay helps with this' })
  return eligibilityPush(bot, ctx, tool, false)
}

/** "Is this transition realistic for you? Yes.": what they already have, what the program adds, the role it leads to. */
function bridgeCard(bot: Bot, ctx: StudioCtx) {
  const readiness = ctx.tools()['skill-gap']?.card?.gauge ?? null
  const b = bridgeFor(ctx.answers, readiness)
  if (!b.have.length || !b.add.length) return
  bot.card({ type: 'bridge', ...b, program: programForLearner(ctx.answers)?.name ?? '' })
}

/** Set when the learner said yes to the test elsewhere, so the test page starts without asking again. */
let startTestNow = false
/** "Maybe later" to the test in this visit: asked at most twice, then left alone. */
let testDeclines = 0

/**
 * The eligibility test, right after a report and before the pitch: "Do you qualify, and where would you start?"
 * `first` = after the counsellor's first conversation (then the pitch follows even if they skip the test).
 */
async function eligibilityPush(bot: Bot, ctx: StudioCtx, from: ToolId, first: boolean) {
  if (!ctx.eligibilityVisible || ctx.done.eligibility) return pitch(bot, ctx, from, null)
  if (!first && testDeclines >= 2) return nextMoves(bot, ctx, from)
  await bot.say(first
    ? `Before I show you the program, let’s check you qualify, ${ctx.first}. It takes 2 minutes and tells us where you’d start.`
    : 'One important step: let’s check you qualify. It takes 2 minutes.')
  bot.card({ type: 'elig-push' })
  track('action', 'elig:push_shown', { from })
  const c = await bot.choose([
    { id: 'test', label: 'Check if I qualify · 2 min', icon: 'award' },
    ...(first ? [{ id: 'program', label: 'Show me the program first', icon: 'folder' as IconName }] : []),
    { id: 'later', label: 'Maybe later', icon: 'clock' },
  ])
  if (c.id === 'test') {
    track('action', 'elig:push_accepted', { from })
    startTestNow = true
    return ctx.go('/dashboard/eligibility')
  }
  testDeclines++
  track('action', 'elig:push_declined', { from })
  if (first) return pitch(bot, ctx, from, null)
  await bot.say('No problem, it’s here whenever you’re ready.')
  return nextMoves(bot, ctx, from)
}

/** The plan, built on the test result when there is one: their program, then the two strengths that answer their pain. */
async function pitch(bot: Bot, ctx: StudioCtx, from: ToolId | 'eligibility', band: string | null) {
  const a = ctx.answers
  const diff = a.difficulty ?? 'roadmap'
  const program = programForLearner(a)
  const lead = band === 'ready' ? `You qualify, ${ctx.first}. Here’s your path from where you are:`
    : band === 'primer' ? `You qualify, with a short primer first. Here’s your path:`
      : band === 'foundation' ? 'Here’s the path I’d suggest, starting with the foundations:'
        : `Here’s how we’d close these gaps, especially “${lower(labelOf(DIFFICULTIES, diff))}”:`
  await bot.say(lead)
  bot.card({ type: 'program', interest: a.interest ?? 'ai', programId: program?.id })
  bridgeCard(bot, ctx)
  bot.card({ type: 'roles', roles: rolesFor(a), note: payNote(a), programId: program?.id })
  bot.card({ type: 'usp', ids: USP_FOR_DIFFICULTY[diff] ?? ['customisation', 'projects'], lead: 'Made for what you told me' })
  track('action', 'counsellor_pitch_shown', { difficulty: diff, interest: a.interest ?? '', program: program?.id ?? '', tested: String(band !== null) })
  return decisionAsk(bot, ctx, from, band, true)
}

/** The decision: a mentor call that confirms batch, seats, fee and any scholarship; or a call now; or the plan by email. */
async function decisionAsk(bot: Bot, ctx: StudioCtx, from: ToolId | 'eligibility', band: string | null, offerProjects: boolean) {
  const tested = band !== null
  const program = programForLearner(ctx.answers)
  bot.card({ type: 'decision', eligible: band === 'ready' || band === 'primer' ? true : band === 'foundation' ? false : null, programId: program?.id })
  await bot.say(tested
    ? 'The last step is a free call with a mentor. They’ll confirm your batch, seats and fee, and check any scholarship for you. Shall I book it?'
    : 'Next, a free call with a mentor: they’ll confirm the right program, your batch and fee, and check any scholarship.')
  track('action', 'decision:asked', { from, tested: String(tested) })
  const opts: Choice[] = [
    ...(!tested && ctx.eligibilityVisible && !ctx.done.eligibility ? [{ id: 'test', label: 'Check if I qualify · 2 min', icon: 'award' as IconName }] : []),
    { id: '/dashboard/sessions', label: 'Book my mentor call', icon: 'calendar' },
    { id: 'call', label: 'Call me now', icon: 'phone' },
    { id: 'email', label: 'Email me my plan', icon: 'mail' },
    ...(offerProjects ? [{ id: 'projects', label: 'Show me the projects first', icon: 'folder' as IconName }] : []),
  ]
  const c = await bot.choose(opts)
  if (c.id === 'test') { startTestNow = true; track('action', 'elig:push_accepted', { from: 'decision' }); return ctx.go('/dashboard/eligibility') }
  if (c.id === 'projects') {
    const programId = programForLearner(ctx.answers)?.id
    const items = await ctx.projects(programId)
    bot.alive()
    bot.card({ type: 'projects', interest: ctx.answers.interest ?? 'ai', programId, items })
    bot.card({ type: 'proof' })
    await bot.say('That’s the work you’d have on your CV.')
    return decisionAsk(bot, ctx, from, band, false)
  }
  track('action', 'decision:taken', { choice: c.id === '/dashboard/sessions' ? 'mentor' : c.id, from })
  if (c.id === 'call') return ctx.call('chat')
  if (c.id === 'email') {
    const tool = (['roadmap', 'skill-gap', 'salary'] as ToolId[]).find((t) => ready(ctx, t))
    const sent = tool ? await postJson(`/api/tools/${tool}/email`, {}) : null
    bot.alive()
    await bot.say(sent?.ok
      ? 'Sent to your email. Whenever you’re ready, your mentor call is one tap away.'
      : 'I’ll email your plan once your first report is ready. Your mentor call is one tap away whenever you want it.')
    return nextMoves(bot, ctx, from === 'eligibility' ? 'eligibility' : from)
  }
  return ctx.go(c.id)
}

// ---------- Eligibility test (fixed questions) ----------

export async function eligibilityFlow(bot: Bot, ctx: StudioCtx) {
  bot.divider('Eligibility test')
  const area = labelOf(INTERESTS, ctx.answers.interest) ?? 'AI & GenAI'
  const res = await getJson('/api/eligibility')
  bot.alive()
  if (!res.ok) { await bot.say(res.error); return }
  let state = res.data.state as TestState
  const rules = res.data.rules as { questions: number; perQuestionSeconds: number } | undefined

  if (!state.attempts.available && state.status !== 'completed') {
    await bot.say('The eligibility test isn’t open right now. A mentor can check your readiness with you on a free call instead.')
    return nextMoves(bot, ctx, 'eligibility')
  }
  if (state.status === 'in_progress') {
    await bot.say('Let’s pick up where you left off. The timer is still running.')
    state = await bot.live<TestState>({ type: 'elig-run', state })
  } else {
    if (state.status === 'completed') {
      await bot.say(`Your best score so far is ${state.attempts.best ?? state.score}/100. Here’s your latest result.`)
      bot.card({ type: 'elig-result', result: state })
      if (state.attempts.left <= 0) {
        await bot.say('You’ve used all your attempts. A mentor will go through your best score and the right starting point with you.')
        return nextMoves(bot, ctx, 'eligibility')
      }
      await bot.say(`You have ${state.attempts.left} attempt${state.attempts.left === 1 ? '' : 's'} left. Most people score higher after a quick chat with a mentor about what to brush up.`)
      const c = await bot.choose([
        { id: '/dashboard/sessions', label: 'Talk to a mentor first', icon: 'calendar' },
        { id: 'retake', label: `Retake now (attempt ${state.attempts.used + 1})`, icon: 'refresh' },
      ])
      if (c.id !== 'retake') return ctx.go(c.id)
    } else {
      await bot.say(`This checks if you’re ready for Learnbay’s ${area} program. It’s quick, and there’s no maths: just reasoning, key terms and tools.`)
      bot.card({ type: 'elig-intro', questions: rules?.questions ?? 10, seconds: rules?.perQuestionSeconds ?? 20, attemptsLeft: state.attempts.left, area })
      // Already said yes (from the counsellor's push): no second "are you sure?".
      if (!startTestNow) {
        const c = await bot.choose([{ id: 'start', label: 'Start the test', icon: 'arrowRight' }, { id: 'later', label: 'Not now', icon: 'clock' }])
        if (c.id === 'later') return homeFlow(bot, ctx, 'menu')
      }
      startTestNow = false
    }
    if (!ctx.answers.eduLevel) {
      await bot.say('Before we begin: what’s your highest qualification?')
      const e = await bot.choose(EDU_LEVELS, { style: 'chips' })
      ctx.answers.eduLevel = e.id
    }
    const start = await postJson('/api/eligibility/start', { answers: { eduLevel: ctx.answers.eduLevel } })
    bot.alive()
    if (!start.ok) { await bot.say(start.error); return nextMoves(bot, ctx, 'eligibility') }
    track('action', 'eligibility_started', { from: 'chat' })
    await bot.say('Good luck! Tap the answer you think is right.', { quick: true })
    const first = start.data.state as TestState
    state = first.status === 'in_progress' ? await bot.live<TestState>({ type: 'elig-run', state: first as EligInProgress }) : first
  }
  if (state.status !== 'completed') return
  ctx.markDone('eligibility')
  const done = state as EligCompleted
  bot.card({ type: 'elig-result', result: done })
  track('action', 'elig:completed', { band: done.band.id })
  await bot.say(`${done.band.title}. ${done.band.text}`)
  // Peak interest: the plan is built on the result, then the decision.
  return pitch(bot, ctx, 'eligibility', done.band.id)
}

// ---------- Mentor call ----------

export async function sessionsFlow(bot: Bot, ctx: StudioCtx) {
  bot.divider('Free 1:1 with a mentor')
  const s = ctx.latestSession
  if (s?.preferred_date) {
    const when = `${new Date(`${s.preferred_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}${s.preferred_time ? ` at ${s.preferred_time}` : ''}`
    await bot.say(`You already asked for a call on ${when}${s.status === 'new' ? ', and a mentor will confirm it soon' : ''}. Want another slot?`)
  }
  await bot.say('In 30 minutes a Learnbay mentor goes through your results, the right program for your background, and fees or EMI if you want. It’s free.')
  const booked = await bot.live<{ when: string }>({ type: 'booking' })
  ctx.latestSession = { preferred_date: null, preferred_time: null, status: 'new' }
  ctx.markDone('sessions')
  await bot.say(`Done. You’re requested for ${booked.when}. A mentor will confirm and call you on your registered number.`)
  await bot.say('Tip: bring your reports. Mentors use them to skip the basics and get straight to your plan.')
  return nextMoves(bot, ctx, 'sessions')
}

// ---------- Masterclasses ----------

export async function masterclassFlow(bot: Bot, ctx: StudioCtx) {
  bot.divider('Masterclasses')
  const label = labelOf(INTERESTS, ctx.answers.interest) ?? 'AI & GenAI'
  await bot.say(`Here are live masterclasses and free material for ${label}. Tap “Notify me” and I’ll let you know about the next one.`)
  bot.card({ type: 'masterclass', interest: ctx.answers.interest ?? 'ai', label })
  return nextMoves(bot, ctx, 'sessions')
}

// ---------- Counselling: the learner goes off the script ----------

export type CounselOpts = {
  context: string
  /** What they were doing, for the counsellor (e.g. "their Salary Benchmark"). */
  was: string
  /** The option that goes back to it ("Continue with my Salary Benchmark"). */
  resumeLabel: string
  /** When nothing was set aside: what "continue" does instead. */
  fallback: () => void
  /** The next counselling turn number (the counsellor stops probing and recommends after two). */
  round: () => number
  /** Leaves the side conversation for a new flow (drops the question that was set aside). */
  restart: (flow: (bot: Bot) => Promise<void>) => void
}

/**
 * The learner asked something, doubted something or compared us while a question was on screen. The counsellor has
 * answered; now they understand the real concern (a probing question with likely answers), then point to the service
 * that helps, suggest a better-fitting track (switched only with the learner's approval), or go back to the question.
 */
export async function counselFlow(bot: Bot, ctx: StudioCtx, d: Detour, first: AiResult, o: CounselOpts): Promise<void> {
  let r = first
  let profileChanged = false
  for (let turn = 0; ; turn++) {
    profileChanged = profileChanged || Boolean(r.profileUpdated)
    const better = r.suggestTrack && r.suggestTrack !== ctx.answers.interest ? trackOf(r.suggestTrack) : null
    const opts: Choice[] = []
    // Their profile changed: the question from before may no longer apply, so lead to the path that fits now.
    if (profileChanged) opts.push({ id: 'c-fit', label: 'Show my best-fit path', hint: 'Roadmap, tools, projects and how well it fits you', icon: 'route' })
    if (r.followUp && r.followUp.options.length >= 2) {
      await bot.say(r.followUp.question)
      r.followUp.options.forEach((label, i) => opts.push({ id: `c-say-${i}`, label, icon: 'message' }))
    } else if (better || r.action || profileChanged) {
      await bot.say(turn ? 'Here’s what I’d suggest:' : 'Where would you like to go from here?', { quick: !turn })
    }
    const betterProgram = !better && r.suggestProgram && r.suggestProgram !== programForLearner(ctx.answers)?.id ? getProgram(r.suggestProgram) : null
    if (better) opts.push({ id: 'c-track', label: `Show me the ${better.label} path`, hint: better.hint, icon: 'route' })
    if (betterProgram) opts.push({ id: 'c-program', label: `Tell me about the ${betterProgram.name}`, icon: 'book' })
    if (r.action) opts.push({ id: r.action.href, label: r.action.label, icon: 'arrowRight' })
    if (!opts.length) opts.push({ id: 'c-call', label: 'Talk it through on a quick call', icon: 'phone' })
    if (!profileChanged) opts.push({ id: 'c-resume', label: o.resumeLabel, icon: 'refresh' })
    const c = await bot.choose(opts.slice(0, 6))
    if (c.id.startsWith('c-say-')) {
      r = await bot.ai({ message: c.label, context: o.context, counsel: { was: o.was, round: o.round() } })
      ctx.showCard(r.show)
      if (r.goNow && r.action) return ctx.go(r.action.href)
      continue
    }
    if (c.id === 'c-track' && better) return trackSwitch(bot, ctx, d, better.interest, o)
    if (c.id === 'c-program' && betterProgram) return programSwitch(bot, ctx, d, betterProgram.id, o)
    if (c.id === 'c-resume') return resume(bot, d, o)
    if (c.id === 'c-fit') return o.restart((b) => programFitFlow(b, ctx))
    if (c.id === 'c-call') { ctx.call('chat'); return resume(bot, d, o, true) }
    track('action', 'counsel_route', { to: c.id })
    return ctx.go(c.id)
  }
}

/** Back to the question that was set aside, asked again, or to the menu if there was none. */
async function resume(bot: Bot, d: Detour, o: CounselOpts, quiet = false) {
  const q = d.question?.trim()
  if (!quiet) await bot.say(q && q.length <= 160 ? `Sure, let’s continue. ${q}` : 'Sure, let’s continue from where we were.')
  if (!d.restore()) o.fallback()
}

/** Shows another program (e.g. Applied AI Practitioner for a non-programmer) and switches to it only if they say yes. */
async function programSwitch(bot: Bot, ctx: StudioCtx, d: Detour, programId: string, o: CounselOpts) {
  const next = getProgram(programId)
  const now = programForLearner(ctx.answers)
  track('action', 'program_suggested', { from: now?.id ?? '', to: programId })
  await bot.say(`Here’s the ${next.name}, and what you’d learn:`)
  bot.card({ type: 'program', interest: ctx.answers.interest ?? 'ai', programId })
  bot.card({ type: 'curriculum', interest: ctx.answers.interest ?? 'ai', programId })
  await bot.say(`Shall I make the ${next.name} your recommended program${now ? ` instead of the ${now.name}` : ''}?`)
  const c = await bot.choose([
    { id: 'yes', label: 'Yes, switch my program', icon: 'check' },
    { id: 'no', label: now ? `Keep the ${now.name}` : 'Not now', icon: 'arrowLeft' },
    { id: 'call', label: 'Help me decide on a quick call', icon: 'phone' },
  ])
  if (c.id === 'call') { ctx.call('chat'); return resume(bot, d, o, true) }
  if (c.id === 'no') { await bot.say('No problem, we’ll keep your current program.'); return resume(bot, d, o) }
  const hadReports = TOOLS.some((t) => ready(ctx, t.id))
  const ok = await ctx.switchProgram(programId)
  bot.alive()
  if (!ok) { await bot.say('I couldn’t update your plan just now. A mentor can do it with you on a free call.'); return resume(bot, d, o) }
  track('action', 'program_switched', { from: now?.id ?? '', to: programId })
  bot.event(`Program updated · ${next.name}`, 'info')
  const rebuilt = hadReports && TOOLS.every((t) => !ready(ctx, t.id))
  await bot.say(`Done! Your plan now follows the ${next.name}.${rebuilt ? ' Your reports will be rebuilt for it.' : ''} Where shall we start?`)
  const n = await bot.choose([
    { id: '/dashboard/skill-gap', label: 'Check my skill gaps for this program', icon: 'chart' },
    { id: '/dashboard/roadmap', label: 'Build my roadmap', icon: 'route' },
    { id: 'c-resume', label: o.resumeLabel, icon: 'refresh' },
  ])
  if (n.id === 'c-resume') return resume(bot, d, o)
  return ctx.go(n.id)
}

/** Shows the other track's career path and moves the learner to it only if they say yes. */
async function trackSwitch(bot: Bot, ctx: StudioCtx, d: Detour, to: string, o: CounselOpts) {
  const next = trackOf(to)
  if (!next) return resume(bot, d, o)
  const now = trackOf(ctx.answers.interest)
  const hadReports = TOOLS.some((t) => ready(ctx, t.id))
  track('action', 'track_path_shown', { from: now?.interest ?? '', to })
  await bot.say(`Here’s how the ${next.label} path would look for you, ${ctx.first}:`)
  bot.card({ type: 'career-path', interest: to, from: now?.interest })
  const toProgram = programForLearner({ ...ctx.answers, interest: to, program: undefined })?.id
  const toItems = await ctx.projects(toProgram)
  bot.alive()
  bot.card({ type: 'projects', interest: to, programId: toProgram, items: toItems })
  await bot.say(`Shall I move your plan to the ${next.label}? Your recommended program will change to match${hadReports ? ' and your reports will be rebuilt for it' : ''}. You can always switch back.`)
  const c = await bot.choose([
    { id: 'yes', label: `Yes, move me to the ${next.label}`, icon: 'check' },
    { id: 'no', label: now ? `Stay on the ${now.label}` : 'Not now', icon: 'arrowLeft' },
    { id: 'call', label: 'Help me decide on a quick call', icon: 'phone' },
  ])
  if (c.id === 'call') { ctx.call('chat'); return resume(bot, d, o, true) }
  if (c.id === 'no') {
    await bot.say(`No problem, we’ll stay with the ${now?.label ?? 'plan you have'}.`)
    return resume(bot, d, o)
  }
  const ok = await ctx.switchTrack(to)
  bot.alive()
  if (!ok) {
    await bot.say('I couldn’t update your plan just now. A mentor can do it with you on a free call.')
    return resume(bot, d, o)
  }
  track('action', 'track_switched', { from: now?.interest ?? '', to })
  bot.event(`Plan updated · ${next.label}`, 'info')
  await bot.say(`Done, ${ctx.first}! You’re now on the ${next.label}. This is the program I’d recommend for you now:`)
  bot.card({ type: 'program', interest: to })
  await bot.say(hadReports ? 'Your earlier reports were for your old track, so let’s rebuild them for this one. Where shall we start?' : 'Where shall we start?')
  const n = await bot.choose([
    { id: '/dashboard/roadmap', label: 'Build my new roadmap', icon: 'route' },
    { id: '/dashboard/skill-gap', label: 'Check my skill gaps for this track', icon: 'chart' },
    { id: 'c-resume', label: o.resumeLabel, icon: 'refresh' },
  ])
  if (n.id === 'c-resume') return resume(bot, d, o)
  return ctx.go(n.id)
}

// ---------- Re-enquiry: a returning learner picked a different track ----------

/**
 * They came back and picked another track (e.g. FDE last time, AI today). Nothing changes without a yes: the counsellor
 * shows the new path, and on yes the profile moves to it and the skill-gap analysis runs again for the new program.
 */
export async function trackChangeFlow(bot: Bot, ctx: StudioCtx, to: string) {
  const next = trackOf(to)
  const now = trackOf(ctx.answers.interest)
  if (!next || !now || next.interest === now.interest) return homeFlow(bot, ctx, 'menu')
  const me = getCounsellor(ctx.counsellor().id)
  track('action', 'track_reenquiry', { from: now.interest, to })
  await bot.say(`Welcome back, ${ctx.first}! It’s ${me.name}. Last time you were exploring the ${now.label}, and today you picked the ${next.label}.`)
  bot.card({ type: 'career-path', interest: to, from: now.interest })
  // Honest advice: if the track they picked fits their profile poorly, say so and offer the better fit.
  const picked = programForLearner({ ...ctx.answers, interest: to, program: undefined })
  const best = fitComparison(ctx.answers)[0]
  const pickedFit = picked ? fitFor(ctx.answers, picked.id) : null
  const betterFit = best && pickedFit && best.programId !== pickedFit.programId && best.score - pickedFit.score >= 3 ? best : null
  if (betterFit && pickedFit) {
    await bot.say(`To be honest with you: from your profile, the ${next.label} fits you about ${pickedFit.score}/10, while the ${betterFit.name} fits ${betterFit.score}/10.`)
  }
  await bot.say(`Shall I map the ${next.label} for you instead? Your profile and reports will move to it.`)
  const c = await bot.choose([
    ...(betterFit ? [{ id: 'fit', label: `Show me my best-fit path (${betterFit.score}/10)`, icon: 'route' as IconName }] : []),
    { id: 'yes', label: `Yes, map the ${next.label} for me`, icon: 'check' },
    { id: 'no', label: `No, stay on the ${now.label}`, icon: 'arrowLeft' },
    { id: 'call', label: 'Help me decide on a quick call', icon: 'phone' },
  ])
  if (c.id === 'fit') return programFitFlow(bot, ctx)
  if (c.id === 'call') { ctx.call('chat'); return homeFlow(bot, ctx, 'menu') }
  if (c.id === 'no') {
    await bot.say(`No problem, we’ll continue with the ${now.label}.`)
    return homeFlow(bot, ctx, 'menu')
  }
  if (!(await ctx.switchTrack(to))) {
    bot.alive()
    await bot.say('I couldn’t update your profile just now. A mentor can do it with you on a free call.')
    return homeFlow(bot, ctx, 'menu')
  }
  bot.alive()
  track('action', 'track_switched', { from: now.interest, to, via: 'reenquiry' })
  bot.event(`Profile updated · ${next.label}`, 'info')
  await bot.say(`Done! You’re now on the ${next.label}. Let’s redo your skill-gap analysis for it, so everything we plan fits the new goal.`)
  // Not probed yet: the counsellor's first conversation (which ends with the skill-gap report) comes first.
  return probed(ctx) ? toolFlow(bot, ctx, 'skill-gap', true) : counsellorFirstFlow(bot, ctx)
}

// ---------- Best-fit path: compare, show the roadmap, then switch only on a yes ----------

/**
 * The program that fits their profile best, shown properly before anything changes: how each option scores for
 * them, the roadmap (modules), the tools they'd use, the projects they'd build and the roles it opens. On yes, the
 * track and program change in the system and the conversation and reports carry on for it.
 */
export async function programFitFlow(bot: Bot, ctx: StudioCtx) {
  const keep = async (patch: Answers) => { if (!(await ctx.saveAnswers(patch))) throw new Error('save failed'); bot.alive() }
  // Understand the profile first if anything important is missing.
  if (!ctx.answers.programmer) {
    await bot.say('One thing so I get this right: do you write code in your work?')
    await keep({ programmer: (await bot.choose(PROGRAMMER.map((p) => ({ ...p, icon: PROGRAMMER_ICONS[p.id] })))).id })
  }
  if (!ctx.answers.role && !inferredRole(ctx.answers)) {
    await bot.say('And what’s your current role?')
    const roles = ROLES.filter((r) => r.id !== 'student')
    const c = await bot.choose([...roles.map((r) => ({ ...r, icon: ROLE_ICONS[r.id] })), { id: ROLE_OTHER, label: 'Something else', icon: 'plus' as IconName }], { style: 'chips' })
    await keep({ role: c.id })
  }
  const fits = fitComparison(ctx.answers)
  const best = fits[0]
  if (!best) return homeFlow(bot, ctx, 'menu')
  const program = getProgram(best.programId)
  track('action', 'fit_shown', { best: best.programId, score: best.score, others: fits.slice(1).map((f) => `${f.programId}:${f.score}`).join(',') })
  await bot.say(`Here’s how the options fit you, ${ctx.first}, based on everything you’ve told me:`)
  bot.card({ type: 'fit', rows: fits })
  bridgeCard(bot, { ...ctx, answers: { ...ctx.answers, program: best.programId } })
  await bot.say(`The ${program.name} fits you best. Here’s your roadmap, the tools you’d use and the projects you’d build:`)
  bot.card({ type: 'curriculum', interest: ctx.answers.interest ?? 'ai', programId: program.id })
  const items = await ctx.projects(program.id)
  bot.alive()
  bot.card({ type: 'projects', interest: ctx.answers.interest ?? 'ai', programId: program.id, items })
  bot.card({ type: 'roles', roles: rolesFor({ ...ctx.answers, program: program.id }), note: payNote(ctx.answers), programId: program.id })
  const current = programForLearner(ctx.answers)
  const already = ctx.answers.program === program.id
  await bot.say(already ? `You’re already set up for the ${program.name}. Shall we carry on?` : `Shall we go ahead with the ${program.name}? It fits your profile ${best.score}/10. I’ll set your track and program to it, and all your reports will follow.`)
  const c = await bot.choose([
    { id: 'yes', label: already ? 'Yes, carry on' : `Yes, go ahead with the ${program.name}`, icon: 'check' },
    ...fits.slice(1, 2).map((f) => ({ id: `other:${f.programId}`, label: `I’d rather do the ${f.name} (${f.score}/10)`, icon: 'arrowLeft' as IconName })),
    { id: 'call', label: 'Help me decide on a quick call', icon: 'phone' },
  ])
  if (c.id === 'call') { ctx.call('chat'); return }
  const chosen = c.id.startsWith('other:') ? c.id.slice(6) : program.id
  if (!already || chosen !== program.id) {
    const hadReports = TOOLS.some((t) => ready(ctx, t.id))
    const ok = await ctx.switchProgram(chosen)
    bot.alive()
    if (!ok) { await bot.say('I couldn’t update your plan just now. A mentor can do it with you on a free call.'); return homeFlow(bot, ctx, 'menu') }
    const name = getProgram(chosen).name
    track('action', 'program_switched', { from: current?.id ?? '', to: chosen, via: 'fit' })
    bot.event(`Track and program updated · ${name}`, 'info')
    await bot.say(`Done, ${ctx.first}! You’re now on the ${name}.${hadReports ? ' Your reports will be rebuilt for it.' : ''}`)
  }
  // Carry on for the new program: the first conversation if it isn't done, otherwise the skill-gap report and pitch.
  if (!probed(ctx)) return counsellorFirstFlow(bot, ctx)
  await bot.say('Let’s measure exactly where you stand for this path. I’ll build your skill-gap report now.')
  return toolFlow(bot, ctx, 'skill-gap', true)
}

// ---------- Counsellors: reconnect, end the chat ----------

/** The learner asked for a particular counsellor (usually the previous one): a short disconnect, then they reconnect. */
export async function switchFlow(bot: Bot, ctx: StudioCtx, to: string) {
  const from = getCounsellor(ctx.counsellor().id)
  const target = getCounsellor(to)
  if (from.id === target.id) { await bot.say(`You’re already chatting with me, ${from.name}. What would you like to do next?`); return homeFlow(bot, ctx, 'menu') }
  const res = await postJson('/api/counsellor', { action: 'switch', to: target.id })
  bot.alive()
  if (!res.ok) { await bot.say(res.error); return }
  await bot.say(`Of course. I’ll connect you with ${target.name} now.`, { quick: true })
  await bot.wait(700)
  bot.event(`${from.name} disconnected`, 'leave')
  bot.event(`Connecting you to ${target.name}…`, 'info')
  await bot.wait(1800)
  ctx.setCounsellor(target.id, from.id)
  bot.speakAs(target.id)
  bot.event(`${target.name} joined the chat`, 'join')
  track('action', 'counsellor_switched', { from: from.id, to: target.id })
  await bot.say(`Hi again, ${ctx.first}! Good to have you back. I’ve caught up on everything, so where would you like to continue?`)
  const c = await bot.choose(menu(ctx))
  ctx.go(c.id)
}

/** Ends the chat. The next visit gets the next counsellor in the rotation, unless the learner asks for this one again. */
export async function endFlow(bot: Bot, ctx: StudioCtx) {
  const me = getCounsellor(ctx.counsellor().id)
  await ctx.askRating('end')
  bot.alive()
  await bot.say(`Thank you for your time, ${ctx.first}! Your reports and plan are saved, and we’re right here whenever you want to continue.`)
  const res = await postJson('/api/counsellor', { action: 'end' })
  bot.alive()
  if (!res.ok) { await bot.say(res.error); return }
  track('action', 'chat_ended', { counsellor: me.id })
  bot.event(`${me.name} left the chat · chat ended`, 'leave')
  const c = await bot.choose([{ id: 'new', label: 'Start a new chat', icon: 'message' }], { style: 'chips', echo: false })
  if (c.id === 'new') window.location.href = '/dashboard?new=1'
}

/** "Can I start over?" when already signed in: nothing is lost, so offer the useful ways to start fresh. */
export async function restartFlow(bot: Bot, ctx: StudioCtx) {
  await bot.say(`You don’t need to start from zero, ${ctx.first}: your profile, reports and test results are all saved. What would you like to do?`)
  const c = await bot.choose([
    { id: 'new-chat', label: 'Start a fresh chat', hint: 'Your old chats stay saved in the left panel', icon: 'refresh' },
    { id: '/dashboard/profile', label: 'Review my saved answers', hint: 'A mentor can correct anything that’s wrong', icon: 'user' },
    { id: 'menu', label: 'Keep going from here', icon: 'arrowRight' },
  ])
  if (c.id === 'new-chat') return ctx.newChat()
  if (c.id === 'menu') return homeFlow(bot, ctx, 'menu')
  ctx.go(c.id)
}
