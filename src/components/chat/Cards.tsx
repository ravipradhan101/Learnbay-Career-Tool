'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '../Icon'
import { openWhyLearnbay } from '../why/WhyLearnbayButton'
import { ActionPlan } from '../report/ActionPlan'
import { Gauge, KpiTiles, PhaseTimeline, RangeChart, SkillBars } from '../report/Charts'
import type { Card, EligCompleted, EligInProgress, ProjectItem } from './engine'
import { CURRICULUM } from '@/config/curriculum'
import { TRACK_PATHS } from '@/config/paths'
import { curriculumOf, projectsFor } from '@/lib/roles'
import { DOMAIN_TAG } from '@/lib/project-domains'
import { REFUND_POLICY } from '@/config/policies'
import { getProgram, programFor } from '@/config/programs'
import { RESOURCES } from '@/config/resources'
import { ALUMNI_STORIES, CAREER_MOVES, CERTIFICATIONS, TRACK_PROJECTS } from '@/config/stories'
import { PUBLISHED_STORY } from '@/config/usps'
import { COUNSELLOR_TITLE, getCounsellor } from '@/lib/counsellors'
import { SKILL_LEVELS, trackOf } from '@/lib/questions'
import { Avatar } from './Avatar'
import { MeetCard } from './MeetCard'
import { PartnerLogos } from '../PartnerLogos'
import { USPS } from '@/config/usps'
import { track } from '@/lib/analytics'
import { getJson, postJson } from '@/lib/client'
import { suggestEmail } from '@/lib/email-suggest'
import { isValidPhone } from '@/lib/questions'
import { CountryPicker } from '../CountryPicker'
import type { ReportCard } from '@/lib/report-card'
import type { Booking, DaySlots } from '@/lib/sessions'
import { getTool } from '@/lib/tools-meta'
import type { TestState } from '@/lib/eligibility'
import { pathKindLabel, type PathCardData } from '@/lib/lead-match'

type Done = (value: unknown) => void

export function CardView({ card, live, onDone }: { card: Card; live: boolean; onDone: Done }) {
  switch (card.type) {
    case 'readiness': return <ReadinessCard />
    case 'preparing': return <PreparingCard steps={card.steps} />
    case 'contact': return <ContactCard answers={card.answers} prefill={card.prefill} live={live} onDone={onDone} />
    case 'otp': return <OtpCard email={card.email} existing={card.existing} live={live} onDone={onDone} />
    case 'intro': return <IntroCard tool={card.tool} />
    case 'generating': return <GeneratingCard tool={card.tool} />
    case 'report': return <ReportCardView card={card.card} />
    case 'elig-intro': return <EligIntroCard {...card} />
    case 'elig-run': return live ? <EligRunner initial={card.state} onDone={onDone} /> : null
    case 'elig-result': return <EligResultCard result={card.result} />
    case 'usp': return <UspCard ids={card.ids} lead={card.lead} />
    case 'booking': return <BookingCard live={live} onDone={onDone} />
    case 'session-ended': return <SessionEndedCard />
    case 'meet': return <MeetCard mode={card.mode} source={card.source} live={live} onDone={onDone} />
    case 'masterclass': return <MasterclassCard interest={card.interest} label={card.label} />
    case 'call': return <CallCard source={card.source} phone={card.phone} by={card.by} />
    case 'call-guest': return <GuestCallCard />
    case 'login': return <LoginCard live={live} onDone={onDone} />
    case 'matching': return live ? <MatchingCard area={card.track} onDone={onDone} /> : null
    case 'counsellor': return <CounsellorCard id={card.id} track={card.track} />
    case 'skill-levels': return <SkillLevelsCard skills={card.skills} live={live} onDone={onDone} />
    case 'skill-matrix': return <SkillMatrixCard skills={card.skills} live={live} onDone={onDone} />
    case 'program': return <ProgramCard interest={card.interest} programId={card.programId} asked={card.asked} />
    case 'proof': return <ProofCard />
    case 'projects': return <ProjectsCard interest={card.interest} programId={card.programId} items={card.items} />
    case 'roles': return <RolesCard roles={card.roles} note={card.note} />
    case 'career-path': return <CareerPathCard interest={card.interest} from={card.from} />
    case 'why': return <WhyCard interest={card.interest} programId={card.programId} />
    case 'curriculum': return <CurriculumCard interest={card.interest} programId={card.programId} />
    case 'refund': return <RefundCard />
    case 'companies': return <CompaniesCard />
    case 'elig-push': return <EligPushCard />
    case 'decision': return <DecisionCard eligible={card.eligible} programId={card.programId} />
    case 'fit': return <FitCard rows={card.rows} />
    case 'path': return <PathCard data={card} />
    case 'bridge': return <BridgeCard have={card.have} add={card.add} role={card.role} readiness={card.readiness} program={card.program} />
  }
}

// ---------- Guest ----------

const READINESS: { icon: IconName; b: string; t: string }[] = [
  { icon: 'target', b: 'Readiness score', t: ' for your target AI role' },
  { icon: 'chart', b: 'Skill gaps', t: ', ranked by what matters most' },
  { icon: 'route', b: 'A custom track', t: ' to your next role with AI' },
]

function ReadinessCard() {
  return (
    <div className="tc-card tc-readiness">
      <div className="tc-readiness-head">
        <span className="tc-ring" aria-hidden="true"><b>?</b></span>
        <div>
          <span className="tc-eyebrow">Your AI career readiness check</span>
          <h3>Ready in about 2 minutes</h3>
        </div>
      </div>
      <ul className="tc-list">
        {READINESS.map((r) => (
          <li key={r.b}><span className="tc-soft-icon"><Icon name={r.icon} size="1.05rem" /></span><span><b>{r.b}</b>{r.t}</span></li>
        ))}
      </ul>
    </div>
  )
}

function PreparingCard({ steps }: { steps: string[] }) {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setDone((d) => Math.min(d + 1, steps.length)), 750)
    return () => window.clearInterval(t)
  }, [steps.length])
  return (
    <div className="tc-card tc-steps" role="status" aria-live="polite">
      {steps.map((s, i) => (
        <div key={s} className={`tc-step ${i < done ? 'done' : i === done ? 'active' : ''}`}>
          <span className="tc-step-dot">{i < done ? <Icon name="check" size="0.8rem" /> : null}</span>{s}
        </div>
      ))}
    </div>
  )
}

const SOURCE_KEY = 'lcn_source'

function ContactCard({ answers, prefill, live, onDone }: { answers: object; prefill: { name: string; email: string; phoneCountry: string; phone: string } | null; live: boolean; onDone: Done }) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [cc, setCc] = useState(prefill?.phoneCountry || '+91')
  const [phone, setPhone] = useState(prefill?.phone ?? '')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  // Against bulk sign-ups by scripts: a field people never see (bots fill every field) and how long the form took.
  const [website, setWebsite] = useState('')
  const shownAt = useRef(Date.now())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/[\s-]/g, '')
    if (name.trim().length < 2) return setError('Please enter your full name.')
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Please enter a valid email address.')
    if (!isValidPhone(cc, digits)) return setError('Please enter a valid phone number.')
    if (!consent) return setError('Please tick the box so I can send you your results.')
    setBusy(true)
    setError('')
    let source: Record<string, string> = {}
    try { source = JSON.parse(window.sessionStorage.getItem(SOURCE_KEY) ?? '{}') } catch { /* ignore */ }
    const contact = { name, email, phoneCountry: cc, phone: digits, consent: true }
    const res = await postJson('/api/onboarding', { answers, contact: { ...contact, website, tookMs: Date.now() - shownAt.current }, source })
    if (!res.ok) { setBusy(false); track('error', 'contact:server', { status: res.status }); return setError(res.error) }
    if (res.data.needsOtp) {
      const r = await postJson('/api/auth/request-otp', { email: String(res.data.email) })
      setBusy(false)
      if (!r.ok) return setError(r.error)
      track('action', res.data.existing ? 'onboarding_existing_email' : 'onboarding_completed')
      setSent(true)
      return onDone({ email: String(res.data.email), existing: Boolean(res.data.existing), contact })
    }
    track('action', 'onboarding_completed')
    setSent(true)
    onDone({ redirect: String(res.data.redirect ?? '/dashboard') })
  }

  if (!live || sent) {
    return <div className="tc-card tc-done"><Icon name="checkCircle" size="1.1rem" /> Details saved{name ? ` for ${name.split(' ')[0]}` : ''}</div>
  }
  return (
    <form className="tc-card tc-form" onSubmit={submit} noValidate>
      <div className="tc-field">
        <label htmlFor="tc-name">Your name</label>
        <input id="tc-name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Kumar" autoFocus />
      </div>
      <div className="tc-field">
        <label htmlFor="tc-email">Email</label>
        <input id="tc-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} readOnly={Boolean(prefill?.email)} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        {/* A typo in a big provider's name ("gmial.com"): one tap fixes it. */}
        {!prefill?.email && /@[^@\s]+\.[a-z]{2,}$/i.test(email) && suggestEmail(email.trim()) && (
          <button type="button" className="tc-email-fix" onClick={() => setEmail(suggestEmail(email.trim())!)}>Did you mean <b>{suggestEmail(email.trim())}</b>?</button>
        )}
      </div>
      <div className="tc-field">
        <label htmlFor="tc-phone">Phone</label>
        <div className="tc-phone">
          <CountryPicker value={cc} onChange={setCc} />
          <input id="tc-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))} placeholder="98765 43210" />
        </div>
      </div>
      <input className="tc-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <label className="tc-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Send me my results and relevant learning updates by email and WhatsApp, and let Learnbay contact me.</span>
      </label>
      {error && <p className="tc-error" role="alert">{error}</p>}
      <button className="tc-btn tc-btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : <>Save &amp; continue <Icon name="arrowRight" size="1rem" /></>}</button>
      <p className="tc-fine"><Icon name="lock" size="0.8rem" /> Private. Used only to send your results and help you plan.</p>
    </form>
  )
}

function OtpCard({ email, existing, live, onDone }: { email: string; existing: boolean; live: boolean; onDone: Done }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [ok, setOk] = useState(false)

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await postJson('/api/auth/verify-otp', { email, code })
    setBusy(false)
    if (!r.ok) { track('error', 'contact:otp'); return setError(r.error) }
    track('action', existing ? 'login_completed' : 'email_verified')
    setOk(true)
    onDone({ onboarded: Boolean(r.data.onboarded) })
  }
  async function resend() {
    setInfo('')
    const r = await postJson('/api/auth/request-otp', { email })
    if (r.ok) setInfo('New code sent.')
    else setError(r.error)
  }

  if (!live || ok) return <div className="tc-card tc-done"><Icon name="checkCircle" size="1.1rem" /> Email confirmed</div>
  return (
    <form className="tc-card tc-form" onSubmit={verify} noValidate>
      <div className="tc-field">
        <label htmlFor="tc-otp">6-digit code sent to {email}</label>
        <input id="tc-otp" className="tc-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      </div>
      {error && <p className="tc-error" role="alert">{error}</p>}
      {info && <p className="tc-fine" role="status">{info}</p>}
      <button className="tc-btn tc-btn-primary" disabled={busy || code.length !== 6}>{busy ? <span className="spinner" /> : <>{existing ? 'Log in' : 'Confirm & meet your counsellor'} <Icon name="arrowRight" size="1rem" /></>}</button>
      <p className="tc-fine">Can&apos;t find it? Check Promotions or Spam. <button type="button" className="tc-link" onClick={resend}>Resend code</button></p>
    </form>
  )
}

// ---------- Reports ----------

function IntroCard({ tool }: { tool: string }) {
  const meta = getTool(tool)
  if (!meta) return null
  return (
    <div className="tc-card">
      <span className="tc-eyebrow">What you will get · about {meta.preview.minutes} min</span>
      <ul className="tc-list">
        {meta.preview.gets.slice(0, 3).map((g) => (
          <li key={g.title}><span className="tc-soft-icon"><Icon name={g.icon} size="1.05rem" /></span><span><b>{g.title}</b> · {g.text}</span></li>
        ))}
      </ul>
    </div>
  )
}

function GeneratingCard({ tool }: { tool: string }) {
  const meta = getTool(tool)
  const [done, setDone] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setDone((d) => Math.min(d + 1, (meta?.generating.length ?? 1) - 1)), 2600)
    return () => window.clearInterval(t)
  }, [meta])
  if (!meta) return null
  return (
    <div className="tc-card tc-steps" role="status" aria-live="polite">
      <b className="tc-card-title">Building your {meta.name}…</b>
      <div className="tc-pulse" aria-hidden="true"><i /></div>
      {meta.generating.map((s, i) => (
        <div key={s} className={`tc-step ${i < done ? 'done' : i === done ? 'active' : ''}`}>
          <span className="tc-step-dot">{i < done ? <Icon name="check" size="0.8rem" /> : null}</span>{s}
        </div>
      ))}
    </div>
  )
}

function ReportCardView({ card }: { card: ReportCard }) {
  const meta = getTool(card.tool)
  const [mail, setMail] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [mailNote, setMailNote] = useState('')
  const h = card.summary.headline
  async function email() {
    setMail('busy')
    setMailNote('')
    const r = await postJson(`/api/tools/${card.tool}/email`, {})
    track(r.ok ? 'action' : 'error', 'report_email', { tool: card.tool, from: 'chat' })
    // Sent: the button says so. Failed: the reason shows, and the button can be tapped again.
    setMail(r.ok ? 'sent' : 'idle')
    setMailNote(r.ok ? String(r.data.message ?? 'Sent to your email') : r.error || 'Couldn’t send it just now. Please try again.')
  }
  return (
    <div className="tc-card tc-report">
      <div className="tc-report-top">
        <span className="tc-icon-tile"><Icon name={meta?.icon ?? 'chart'} size="1.1rem" /></span>
        <b>{meta?.name}</b>
        <span className="tc-pill-ok"><Icon name="checkCircle" size="0.85rem" /> Ready</span>
      </div>
      <div className="tc-hero">
        {card.gauge !== undefined ? <Gauge value={card.gauge} size={132} label={h.label} /> : <p className="tc-big">{h.value}</p>}
        <div>
          <b className="tc-hero-label">{card.gauge !== undefined ? h.label.replace(/^\/100 /, '') : h.label}</b>
          <p>{h.note}</p>
        </div>
      </div>
      <KpiTiles items={card.summary.kpis} />
      <div className="tc-chart">
        {card.chart.kind === 'skills' && <><span className="tc-eyebrow">Biggest gaps · bar = you, line = needed</span><SkillBars skills={card.chart.skills} limit={4} /></>}
        {card.chart.kind === 'ranges' && <><span className="tc-eyebrow">What you could earn · ₹ lakh per year</span><RangeChart rows={card.chart.rows} /></>}
        {card.chart.kind === 'phases' && <><span className="tc-eyebrow">Your plan at a glance</span><PhaseTimeline phases={card.chart.phases} months={card.chart.months} /></>}
      </div>
      <ActionPlan tool={card.tool} actions={card.summary.actions} />
      <div className="tc-actions">
        <Link href={`/dashboard/${card.tool}/report`} className="tc-btn tc-btn-primary tc-btn-sm" scroll={false}>Open full report <Icon name="arrowRight" size="0.9rem" /></Link>
        <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={email} disabled={mail !== 'idle'}>
          {mail === 'busy' ? <span className="spinner" /> : <><Icon name={mail === 'sent' ? 'checkCircle' : 'mail'} size="0.9rem" /> {mail === 'sent' ? 'Sent to your email' : 'Email me the PDF'}</>}
        </button>
      </div>
      {mailNote && <small className={mail === 'sent' ? 'tc-mail-note' : 'tc-error'} role="status">{mailNote}</small>}
    </div>
  )
}

// ---------- Eligibility test ----------

function EligIntroCard({ questions, seconds, attemptsLeft, area }: { questions: number; seconds: number; attemptsLeft: number; area: string }) {
  return (
    <div className="tc-card">
      <span className="tc-eyebrow">{area} eligibility test</span>
      <div className="tc-facts">
        <span><b>{questions}</b> questions</span>
        <span><b>{seconds}s</b> each</span>
        <span><b>No</b> maths</span>
        <span><b>{attemptsLeft}</b> {attemptsLeft === 1 ? 'attempt' : 'attempts'} left</span>
      </div>
      <p className="tc-muted">Reasoning, key terms and tools for {area}. Your score comes straight away.</p>
    </div>
  )
}

function EligRunner({ initial, onDone }: { initial: EligInProgress; onDone: Done }) {
  const [state, setState] = useState<EligInProgress>(initial)
  const [offset, setOffset] = useState(() => initial.serverNow - Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sentFor = useRef(-1)

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])

  const remaining = Math.max(0, state.questionEndsAt - (now + offset))
  const secs = Math.ceil(remaining / 1000)

  async function send(choice: number | null) {
    if (sentFor.current === state.index) return
    sentFor.current = state.index
    setBusy(true)
    setError('')
    const r = await postJson('/api/eligibility/answer', { index: state.index, choice })
    setBusy(false)
    if (!r.ok) { sentFor.current = -1; return setError(r.error) }
    const next = r.data.state as TestState
    if (next.status === 'in_progress') { setOffset(next.serverNow - Date.now()); setState(next); return }
    onDone(next)
  }

  useEffect(() => {
    if (remaining <= 0 && !busy && sentFor.current !== state.index) send(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0, state.index])

  const q = state.question
  const pct = Math.max(0, Math.min(100, (remaining / (q.seconds * 1000)) * 100))
  return (
    <div className="tc-card tc-quiz">
      <div className="tc-quiz-top">
        <span className="tc-eyebrow">Question {state.index + 1} of {state.total} · {q.topic}</span>
        <span className={`tc-timer ${secs <= 5 ? 'low' : ''}`} aria-hidden="true"><Icon name="clock" size="0.85rem" /> {secs}s</span>
      </div>
      <div className="tc-quiz-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <h3 className="tc-quiz-q" aria-live="polite">{q.text}</h3>
      <div className="tc-quiz-options">
        {q.options.map((o, i) => (
          <button key={`${state.index}-${i}`} type="button" className="tc-option" disabled={busy} onClick={() => send(i)}>
            <span className="tc-option-key">{String.fromCharCode(65 + i)}</span>{o}
          </button>
        ))}
      </div>
      {error && <p className="tc-error" role="alert">{error} <button type="button" className="tc-link" onClick={() => send(null)}>Skip</button></p>}
    </div>
  )
}

function EligResultCard({ result }: { result: EligCompleted }) {
  const tone = result.band.id === 'ready' ? 'ok' : result.band.id === 'primer' ? 'mid' : 'low'
  return (
    <div className="tc-card tc-elig-result">
      <div className="tc-hero">
        <Gauge value={result.score} size={132} label="/100 score" />
        <div>
          <span className={`tc-band ${tone}`}>{result.band.title}</span>
          <p>{result.correct} of {result.total} correct · attempt {result.attempt} of {result.attempts.max}</p>
        </div>
      </div>
      <div className="tc-topics">
        {result.breakdown.byTopic.map((t) => (
          <div key={t.topic} className="tc-topic">
            <span>{t.topic}</span>
            <div className="tc-topic-bar"><i style={{ width: `${(t.correct / Math.max(1, t.total)) * 100}%` }} /></div>
            <b>{t.correct}/{t.total}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Learnbay, subtly ----------

function UspCard({ ids, lead }: { ids: (keyof typeof USPS)[]; lead?: string }) {
  return (
    <div className="tc-card tc-usp">
      {lead && <span className="tc-eyebrow">{lead}</span>}
      <div className="tc-usp-list">
        {ids.map((id) => (
          <div key={id} className="tc-usp-item">
            <span className="tc-soft-icon"><Icon name={USPS[id].icon} size="1rem" /></span>
            <span><b>{USPS[id].title}</b><small>{USPS[id].short}</small></span>
          </div>
        ))}
      </div>
      <button type="button" className="tc-link" onClick={() => openWhyLearnbay('chat-usp')}>How Learnbay is different <Icon name="arrowRight" size="0.8rem" /></button>
    </div>
  )
}

// ---------- Counselling call with a Senior Counsellor ----------

type SlotsData = { booking: Booking | null; days: DaySlots[] }

/**
 * Booking a free call: today or tomorrow, 10 AM to 8 PM IST, greyed out when a slot is full or has passed.
 * Once booked, the card shows the booking with a Reschedule option (no cancelling).
 */
function BookingCard({ live, onDone }: { live: boolean; onDone: Done }) {
  const [data, setData] = useState<SlotsData | null>(null)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)
  const load = useCallback(async () => {
    setError('')
    const r = await getJson('/api/sessions')
    if (r.ok) setData({ booking: (r.data.booking as Booking | null) ?? null, days: (r.data.days as DaySlots[]) ?? [] })
    else setError(r.error || 'Please sign in again.')
  }, [])
  useEffect(() => { void load() }, [load])

  // Couldn't load: try again, or move on (the chat never waits on a card that can't load).
  if (error && !data) {
    return (
      <div className="tc-card">
        <p className="tc-error" role="alert">{error}</p>
        <div className="tc-actions-row">
          <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => void load()}><Icon name="refresh" size="0.9rem" /> Try again</button>
          {live && <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => onDone({ skipped: true })}>Skip for now</button>}
        </div>
      </div>
    )
  }
  if (!data) return <div className="tc-card tc-booking"><span className="spinner" /> Loading open slots…</div>

  const b = data.booking
  if (b && !picking) {
    return (
      <div className="tc-card tc-booked">
        <div className="tc-booked-head">
          <span className="tc-booked-icon"><Icon name="calendar" size="1.2rem" /></span>
          <span><small>Your call is booked</small><b>{b.when} <em>IST</em></b></span>
          <span className="tc-booked-tag"><Icon name="checkCircle" size="0.85rem" /> Confirmed</span>
        </div>
        <ul className="tc-booked-list">
          <li><Icon name="phone" size="0.9rem" /> A Senior Career Counsellor will call you on your registered number.</li>
          <li><Icon name="file" size="0.9rem" /> Keep your reports handy: they go straight to your plan, program and fees.</li>
          <li><Icon name="mail" size="0.9rem" /> The confirmation is in your email.</li>
        </ul>
        <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => setPicking(true)}><Icon name="refresh" size="0.9rem" /> Reschedule</button>
      </div>
    )
  }
  return (
    <SlotPicker
      days={data.days}
      current={b}
      onCancel={b ? () => setPicking(false) : undefined}
      onBooked={(booking) => {
        setData({ ...data, booking })
        setPicking(false)
        if (live && !b) onDone({ when: booking.when })
        void load()
      }}
    />
  )
}

function SlotPicker({ days, current, onBooked, onCancel }: { days: DaySlots[]; current: Booking | null; onBooked: (b: Booking) => void; onCancel?: () => void }) {
  const firstOpen = days.find((d) => d.slots.some((s) => s.open))?.date ?? days[0]?.date ?? ''
  const [date, setDate] = useState(firstOpen)
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const day = days.find((d) => d.date === date)
  const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  async function save() {
    setBusy(true)
    setError('')
    const res = current ? await postJson('/api/sessions', { date, time }, 'PATCH') : await postJson('/api/sessions', { date, time, note })
    setBusy(false)
    // Already booked (in another tab, say): show that booking instead of an error.
    if (!res.ok && res.status === 409 && res.data.booking) return onBooked(res.data.booking as Booking)
    if (!res.ok) { track('error', current ? 'session_reschedule' : 'session_booking', { status: res.status }); return setError(res.error) }
    track('action', current ? 'session_rescheduled' : 'session_booked', { time, from: 'chat' })
    // Saved: show it as booked even if the reply carries no booking details (never fall back to the picker).
    const when = typeof res.data.when === 'string' ? res.data.when : `${dateLabel(date)} at ${time}`
    onBooked((res.data.booking as Booking | null) ?? { id: String(res.data.id ?? current?.id ?? ''), date, time, when, status: 'new', rescheduled: current ? current.rescheduled + 1 : 0 })
  }

  return (
    <div className="tc-card tc-booking">
      <span className="tc-eyebrow">{current ? `Move your call (now ${current.when})` : 'Pick a day'}</span>
      <div className="tc-days" role="radiogroup" aria-label="Day">
        {days.map((d) => {
          const any = d.slots.some((s) => s.open)
          return (
            <button key={d.date} type="button" role="radio" aria-checked={date === d.date} className="tc-day" disabled={!any} onClick={() => { setDate(d.date); setTime('') }}>
              <small>{d.label}</small><b>{dateLabel(d.date)}</b>{!any && <em>No slots left</em>}
            </button>
          )
        })}
      </div>
      {day && (
        <>
          <span className="tc-eyebrow">Pick a time (IST) · a 20-minute call, between 10 AM and 8 PM</span>
          <div className="tc-slots" role="radiogroup" aria-label="Time">
            {day.slots.map((s) => {
              const mine = current && current.date === day.date && current.time === s.time
              const disabled = !s.open || Boolean(mine)
              return (
                <button key={s.time} type="button" role="radio" aria-checked={time === s.time} disabled={disabled}
                  className={`tc-slot${time === s.time ? ' on' : ''}`} onClick={() => setTime(s.time)}
                  title={mine ? 'Your current time' : s.left <= 0 ? 'This slot is full' : !s.open ? 'This time has passed' : `${s.left} of 10 places left`}>
                  <b>{s.time}</b>
                  <small>{mine ? 'Current' : s.left <= 0 ? 'Full' : !s.open ? 'Passed' : s.left <= 3 ? `${s.left} left` : 'Open'}</small>
                </button>
              )
            })}
          </div>
        </>
      )}
      {time && !current && (
        <input className="tc-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to discuss? e.g. fees, EMI, weekend batches (optional)" aria-label="Anything to discuss" />
      )}
      {error && <p className="tc-error" role="alert">{error}</p>}
      <div className="tc-actions">
        <button type="button" className="tc-btn tc-btn-accent" disabled={busy || !date || !time} onClick={save}>
          {busy ? <span className="spinner" /> : <><Icon name="calendar" size="1rem" /> {current ? 'Move my call' : 'Book my free call'}</>}
        </button>
        {onCancel && <button type="button" className="tc-btn tc-btn-ghost" onClick={onCancel} disabled={busy}>Keep my current time</button>}
      </div>
    </div>
  )
}

// ---------- Masterclasses ----------

const TOPICS: Record<string, string[]> = {
  ai: ['GenAI / LLMs', 'Agentic AI', 'RAG', 'Prompt engineering', 'Python', 'LLM evaluation'],
  'cloud-devops': ['Cloud (AWS/Azure)', 'Docker', 'Kubernetes', 'Deployment', 'MLOps', 'LLMOps'],
  fde: ['GenAI / LLMs', 'RAG', 'Agentic AI', 'API Development', 'AI apps', 'Deployment'],
  'data-science': ['Python', 'Machine Learning', 'Deep Learning', 'Data analysis', 'GenAI / LLMs'],
  analytics: ['SQL', 'Data analysis', 'Python', 'Databases', 'Prompt engineering'],
}

function MasterclassCard({ interest, label }: { interest: string; label: string }) {
  const [on, setOn] = useState(false)
  const topics = TOPICS[interest] ?? TOPICS.ai
  const picked = RESOURCES.filter((r) => r.topics.some((t) => topics.includes(t))).slice(0, 4)
  return (
    <div className="tc-card">
      <div className="tc-mc-head">
        <span className="tc-icon-tile"><Icon name="play" size="1.05rem" /></span>
        <span><b>Live masterclasses on {label}</b><small>Taught live by industry mentors. Free.</small></span>
        <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" disabled={on} onClick={() => { track('action', 'masterclass_interest', { topic: label, from: 'chat' }); setOn(true) }}>
          {on ? <><Icon name="check" size="0.9rem" /> On the list</> : <><Icon name="bell" size="0.9rem" /> Notify me</>}
        </button>
      </div>
      <span className="tc-eyebrow">Free to start this week</span>
      <div className="tc-res">
        {picked.map((r) => (
          <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="tc-res-item">
            <span><b>{r.title}</b><small>{r.provider} · {r.type}</small></span>
            <Icon name="external" size="0.9rem" />
          </a>
        ))}
      </div>
    </div>
  )
}

// ---------- Calls ----------

/** "Shall I call you now?" One tap places the call (or asks the counsellor team to call back). */
function CallCard({ source, phone, by }: { source: 'button' | 'chat'; phone: string; by: string }) {
  const [state, setState] = useState<'ask' | 'busy' | 'no' | string>('ask')
  async function call() {
    setState('busy')
    const r = await postJson('/api/call', { source })
    track(r.ok ? 'action' : 'error', 'call_requested', { source })
    setState(r.ok ? String(r.data.message) : r.error || 'Please sign in again to request a call.')
  }
  if (state === 'no') return <div className="tc-card tc-done tc-muted-done">No problem. Tap the phone icon at the top whenever you want a call.</div>
  if (state !== 'ask' && state !== 'busy') return <div className="tc-card tc-done"><Icon name="phone" size="1.1rem" /> {state}</div>
  return (
    <div className="tc-card tc-call-card">
      <span className="tc-call-icon" aria-hidden="true"><Icon name="phone" size="1.2rem" /></span>
      <div className="tc-call-text">
        <b>Talk to {by} on a call</b>
        <small>I’ll call you on {phone}. It’s free and takes about 10 minutes.</small>
      </div>
      <div className="tc-actions">
        <button type="button" className="tc-btn tc-btn-accent tc-btn-sm" onClick={call} disabled={state === 'busy'}>{state === 'busy' ? <span className="spinner" /> : <><Icon name="phone" size="0.9rem" /> Yes, call me now</>}</button>
        <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => { track('action', 'call_declined', { source }); setState('no') }} disabled={state === 'busy'}>Not now</button>
      </div>
    </div>
  )
}

/** Before sign-up: a name and a number are enough to get a call. */
function GuestCallCard() {
  const [name, setName] = useState('')
  const [cc, setCc] = useState('+91')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await postJson('/api/call', { name, phoneCountry: cc, phone: phone.replace(/[\s-]/g, ''), consent })
    setBusy(false)
    track(r.ok ? 'action' : 'error', 'call_requested', { source: 'guest' })
    if (!r.ok) return setError(r.error)
    setDone(String(r.data.message))
  }
  if (done) return <div className="tc-card tc-done"><Icon name="phone" size="1.1rem" /> {done}</div>
  return (
    <form className="tc-card tc-form" onSubmit={submit} noValidate>
      <b className="tc-card-title"><Icon name="phone" size="1rem" /> Get a call from a Learnbay counsellor</b>
      <div className="tc-field">
        <label htmlFor="tc-call-name">Your name</label>
        <input id="tc-call-name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="tc-field">
        <label htmlFor="tc-call-phone">Phone</label>
        <div className="tc-phone">
          <CountryPicker value={cc} onChange={setCc} />
          <input id="tc-call-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))} placeholder="98765 43210" />
        </div>
      </div>
      <label className="tc-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Call me about my career options. Learnbay may also follow up on WhatsApp.</span>
      </label>
      {error && <p className="tc-error" role="alert">{error}</p>}
      <button className="tc-btn tc-btn-accent" disabled={busy || !consent}>{busy ? <span className="spinner" /> : <><Icon name="phone" size="1rem" /> Call me</>}</button>
    </form>
  )
}

// ---------- Log in (existing learners) ----------

function LoginCard({ live, onDone }: { live: boolean; onDone: Done }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await postJson('/api/auth/request-otp', { email })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    track('action', 'login_code_requested', { from: 'chat' })
    setSent(true)
    onDone({ email: email.trim() })
  }
  if (!live || sent) return <div className="tc-card tc-done"><Icon name="mail" size="1.1rem" /> Code sent{email ? ` to ${email.trim()}` : ''}</div>
  return (
    <form className="tc-card tc-form" onSubmit={submit} noValidate>
      <div className="tc-field">
        <label htmlFor="tc-login-email">Email you signed up with</label>
        <input id="tc-login-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
      </div>
      {error && <p className="tc-error" role="alert">{error}</p>}
      <button className="tc-btn tc-btn-primary" disabled={busy || !email.includes('@')}>{busy ? <span className="spinner" /> : <>Send my login code <Icon name="arrowRight" size="1rem" /></>}</button>
      <p className="tc-fine">New here? <button type="button" className="tc-link" onClick={() => { setSent(true); onDone({ fresh: true }) }}>Start the quick check instead</button></p>
    </form>
  )
}

/** The sign-in on this device ended (expired, or signed out elsewhere): a system notice, never the counsellor's words. */
function SessionEndedCard() {
  const next = typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
  return (
    <div className="tc-card tc-session-ended" role="status">
      <span className="tc-eyebrow"><Icon name="lock" size="0.85rem" /> Your sign-in on this device has ended</span>
      <p className="small">Your chat, reports and bookings are saved. Sign in with the same email (we send a 6-digit code) to carry on right here.</p>
      <a className="tc-btn tc-btn-primary tc-btn-sm" href={`/login?next=${encodeURIComponent(next)}`}>Sign in to continue <Icon name="arrowRight" size="0.9rem" /></a>
    </div>
  )
}

// ---------- Bruce finds a counsellor ----------

type Slide =
  | { kind: 'story'; name: string; photo?: string; from: string; to: string; company?: string; hike?: string }
  | { kind: 'quote'; quote: string; name: string; role: string }
  | { kind: 'move'; from: string; to: string }
  | { kind: 'usp'; icon: IconName; title: string; text: string }
  | { kind: 'project'; title: string; tools: string }

/** 6–9 seconds of proof while the counsellor is being matched: stories, strengths and projects. */
function MatchingCard({ area, onDone }: { area: string; onDone: Done }) {
  const slides = useMemo<Slide[]>(() => {
    // Real content only: the published learner story, real alumni stories once added, and common career moves.
    const stories: Slide[] = [
      { kind: 'quote', quote: PUBLISHED_STORY.quote, name: PUBLISHED_STORY.name, role: PUBLISHED_STORY.role },
      ...ALUMNI_STORIES.map((s) => ({ kind: 'story' as const, ...s })),
      ...(CAREER_MOVES[area] ?? CAREER_MOVES.ai).map((m) => ({ kind: 'move' as const, ...m })),
    ]
    const usps = (['projects', 'mentors', 'placement'] as const).map((id) => ({ kind: 'usp' as const, icon: USPS[id].icon, title: USPS[id].title, text: USPS[id].short }))
    const projects = (TRACK_PROJECTS[area] ?? TRACK_PROJECTS.ai).map((p) => ({ kind: 'project' as const, ...p }))
    const out: Slide[] = []
    for (let i = 0; i < 4; i++) {
      if (stories[i]) out.push(stories[i])
      if (i < 3 && usps[i]) out.push(usps[i])
      if (i < 3 && projects[i]) out.push(projects[i])
    }
    return out
  }, [area])
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState(0)
  const done = useRef(false)
  const t = trackOf(area)

  useEffect(() => {
    const tick = window.setInterval(() => setI((n) => (n + 1) % slides.length), 2200)
    const steps = window.setInterval(() => setPhase((p) => Math.min(p + 1, 2)), 2600)
    return () => { window.clearInterval(tick); window.clearInterval(steps) }
  }, [slides.length])

  useEffect(() => {
    const started = Date.now()
    postJson('/api/counsellor', { action: 'assign' }).then(async (r) => {
      const wait = Math.max(0, 10_000 + Math.random() * 3000 - (Date.now() - started))
      await new Promise((res) => setTimeout(res, wait))
      if (done.current) return
      done.current = true
      track(r.ok ? 'action' : 'error', 'counsellor_matched', { track: area })
      onDone(r.ok ? { id: String((r.data.counsellor as { id?: string })?.id ?? '') } : null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const s = slides[i]
  const steps = [`Checking ${t ? t.label : 'track'} specialists`, 'Matching your experience and goal', 'Confirming who’s available now']
  return (
    <div className="tc-card tc-match" role="status" aria-live="polite">
      <div className="tc-match-head">
        <span className="tc-match-spin" aria-hidden="true" />
        <div>
          <b>Finding your counsellor…</b>
          <small>{steps[phase]}</small>
        </div>
      </div>
      <div className="tc-match-bar" aria-hidden="true"><i /></div>
      <div className="tc-slide" key={i}>
        {s.kind === 'quote' && (
          <div className="tc-slide-usp">
            <span className="tc-soft-icon"><Icon name="message" size="1rem" /></span>
            <div><span className="tc-eyebrow">From a Learnbay learner</span><b>“{s.quote.length > 110 ? `${s.quote.slice(0, 107)}…` : s.quote}”</b><small>{s.name} · {s.role}</small></div>
          </div>
        )}
        {s.kind === 'story' && (
          <div className="tc-story">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.photo && <img src={s.photo} alt="" width={56} height={56} />}
            <div>
              <span className="tc-eyebrow">Learner story</span>
              <b>{s.name}{s.company ? ` · ${s.company}` : ''}</b>
              <div className="tc-story-move"><span>{s.from}</span><Icon name="arrowRight" size="0.8rem" /><span>{s.to}</span></div>
            </div>
            {s.hike && <span className="tc-hike">{s.hike}<small>hike</small></span>}
          </div>
        )}
        {s.kind === 'move' && (
          <div className="tc-slide-usp">
            <span className="tc-soft-icon"><Icon name="route" size="1rem" /></span>
            <div><span className="tc-eyebrow">A common move on this track</span><div className="tc-story-move"><span>{s.from}</span><Icon name="arrowRight" size="0.8rem" /><span>{s.to}</span></div></div>
          </div>
        )}
        {s.kind === 'usp' && (
          <div className="tc-slide-usp">
            <span className="tc-soft-icon"><Icon name={s.icon} size="1rem" /></span>
            <div><span className="tc-eyebrow">Why Learnbay</span><b>{s.title}</b><small>{s.text}</small></div>
          </div>
        )}
        {s.kind === 'project' && (
          <div className="tc-slide-usp">
            <span className="tc-soft-icon"><Icon name="folder" size="1rem" /></span>
            <div><span className="tc-eyebrow">A project you’ll build</span><b>{s.title}</b><small>{s.tools}</small></div>
          </div>
        )}
      </div>
      <div className="tc-dots" aria-hidden="true">{slides.map((_, n) => <i key={n} className={n === i ? 'on' : ''} />)}</div>
    </div>
  )
}

function CounsellorCard({ id, track }: { id: string; track: string }) {
  const c = getCounsellor(id)
  const t = trackOf(track)
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null)
  useEffect(() => {
    void getJson('/api/counsellor').then((r) => { if (r.ok) setRating(((r.data.ratings as Record<string, { avg: number; count: number }>) ?? {})[id] ?? null) })
  }, [id])
  return (
    <div className="tc-card tc-counsellor">
      <Avatar who={c.id} size={52} online />
      <div>
        <span className="tc-eyebrow">Your counsellor</span>
        <b>{c.name}</b>
        <small>{COUNSELLOR_TITLE}{t ? ` · ${t.label}` : ''}</small>
        {rating && rating.count >= 10 && <small className="tc-rating"><b>★ {rating.avg.toFixed(2)}</b> · {rating.count.toLocaleString('en-IN')} learner ratings</small>}
      </div>
    </div>
  )
}

// ---------- Skill levels ----------

function SkillLevelsCard({ skills, live, onDone }: { skills: { id: string; label: string }[]; live: boolean; onDone: Done }) {
  const [levels, setLevels] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const complete = skills.every((s) => levels[s.id])
  if (!live || sent) {
    return (
      <div className="tc-card tc-levels-done">
        {skills.map((s) => <span key={s.id}>{s.label} · <b>{SKILL_LEVELS.find((l) => l.id === levels[s.id])?.label ?? '—'}</b></span>)}
      </div>
    )
  }
  return (
    <div className="tc-card tc-levels">
      {skills.map((s) => (
        <div key={s.id} className="tc-level-row">
          <span>{s.label}</span>
          <div className="tc-seg" role="radiogroup" aria-label={`${s.label} level`}>
            {SKILL_LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={levels[s.id] === l.id} onClick={() => setLevels((v) => ({ ...v, [s.id]: l.id }))}>{l.label}</button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="tc-btn tc-btn-primary tc-btn-sm" disabled={!complete} onClick={() => { setSent(true); onDone(levels) }}>
        Done <Icon name="arrowRight" size="0.9rem" />
      </button>
    </div>
  )
}

// ---------- The pitch: program, proof, projects ----------

/** `asked`: a program the learner asked about (not necessarily the one recommended for them). */
function ProgramCard({ interest, programId, asked }: { interest: string; programId?: string; asked?: boolean }) {
  const p = programId ? getProgram(programId) : programFor(interest)
  if (!p) return null
  return (
    <div className="tc-card tc-program">
      <span className="tc-eyebrow">{asked ? 'The program you asked about' : 'Recommended for you'}</span>
      <b className="tc-program-name">{p.name}</b>
      <ul>{p.features.map((f) => <li key={f}><Icon name="checkCircle" size="0.9rem" />{f}</li>)}</ul>
      <div className="tc-actions">
        <Link href="/dashboard/sessions" scroll={false} className="tc-btn tc-btn-primary tc-btn-sm">Talk to a Senior Counsellor, free</Link>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="tc-btn tc-btn-ghost tc-btn-sm">Program details <Icon name="external" size="0.8rem" /></a>
      </div>
    </div>
  )
}

function ProofCard() {
  return (
    <div className="tc-card tc-proof">
      <figure>
        <blockquote>“{PUBLISHED_STORY.quote}”</blockquote>
        <figcaption><b>{PUBLISHED_STORY.name}</b> · {PUBLISHED_STORY.role}</figcaption>
      </figure>
      <div className="tc-proof-row">
        <span className="tc-proof-stat"><b>350+</b><small>hiring companies</small></span>
        <div className="tc-proof-certs">{CERTIFICATIONS.map((c) => <span key={c}><Icon name="award" size="0.8rem" />{c}</span>)}</div>
      </div>
      <PartnerLogos size={18} className="tc-proof-logos" />
    </div>
  )
}

function ProjectsCard({ interest, programId, items }: { interest: string; programId?: string; items?: ProjectItem[] }) {
  // From the project library (picked for this learner); older chats and empty libraries fall back to the program page.
  if (items?.length) {
    const library = items.filter((p) => p.kind !== 'idea')
    const ideas = items.filter((p) => p.kind === 'idea')
    return (
      <div className="tc-card tc-projects">
        <span className="tc-eyebrow">Projects you’ll build</span>
        {library.some((p) => p.tailored) && <small className="tc-project-note">Written for your background</small>}
        {library.map((p, n) => (
          <div key={p.title} className="tc-project">
            <span className="tc-project-n">{n + 1}</span>
            <div>
              <b>{p.title}</b>
              {p.objective
                ? <>
                    <small className="tc-project-desc"><em>Goal:</em> {p.objective}</small>
                    {p.outcome && <small className="tc-project-desc"><em>You’ll achieve:</em> {p.outcome}</small>}
                  </>
                : p.description && <small className="tc-project-desc">{p.description}</small>}
              <span className="tc-project-meta">
                {p.kind === 'capstone' && <span className="tc-project-tag">Capstone</span>}
                {p.industry && <span className="tc-project-tag domain">{p.industry}</span>}
                {!p.industry && p.domain && <span className="tc-project-tag domain">{DOMAIN_TAG[p.domain] ?? p.domainLabel ?? p.domain}</span>}
                {p.tools.length > 0 && <small>{p.tools.join(' · ')}</small>}
              </span>
            </div>
          </div>
        ))}
        {ideas.length > 0 && (
          <>
            <span className="tc-eyebrow tc-project-ideas">Bring your own project: ideas from your work</span>
            {ideas.map((p) => (
              <div key={p.title} className="tc-project idea">
                <span className="tc-project-n"><Icon name="sparkles" size="0.8rem" /></span>
                <div>
                  <b>{p.title}</b>
                  {p.objective && <small className="tc-project-desc"><em>Goal:</em> {p.objective}</small>}
                  {p.outcome && <small className="tc-project-desc"><em>You’ll achieve:</em> {p.outcome}</small>}
                  {p.tools.length > 0 && <span className="tc-project-meta"><small>{p.tools.join(' · ')}</small></span>}
                </div>
              </div>
            ))}
          </>
        )}
        <small className="tc-project-byop">Have a project from your own work? Bring it: your mentors guide you on it too.</small>
      </div>
    )
  }
  const list = projectsFor(programId, interest)
  return (
    <div className="tc-card tc-projects">
      <span className="tc-eyebrow">Projects you’ll build</span>
      {list.map((p, n) => (
        <div key={p.title} className="tc-project">
          <span className="tc-project-n">{n + 1}</span>
          <div><b>{p.title}</b><small>{p.tools}</small></div>
        </div>
      ))}
    </div>
  )
}


/** A link to the learner's course page, bold italic (only catalog URLs). */
export function CourseLink({ interest, label, programId }: { interest: string; label?: string; programId?: string }) {
  const p = programId ? getProgram(programId) : programFor(interest)
  if (!p) return null
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="tc-course-link" onClick={() => track('action', 'course_link', { program: p.id })}>
      <b><i>{label ?? `Explore the ${p.name}`}</i></b> <Icon name="external" size="0.8rem" />
    </a>
  )
}

/** The career path of a track: where it leads, the stages, and the program that takes you there. */
function CareerPathCard({ interest, from }: { interest: string; from?: string }) {
  const t = trackOf(interest)
  const path = TRACK_PATHS[interest]
  if (!t || !path) return null
  const was = from ? trackOf(from) : null
  return (
    <div className="tc-card tc-path">
      <div className="tc-path-head">
        <span className="tc-soft-icon"><Icon name={path.icon} size="1.05rem" /></span>
        <div>
          <span className="tc-eyebrow">{was && was.interest !== interest ? `${was.label} → ${t.label}` : 'Your career path'}</span>
          <b className="tc-path-title">{t.label} · {t.hint}</b>
        </div>
      </div>
      <p className="tc-path-why">{path.why}</p>
      <ol className="tc-path-steps">
        {path.stages.map((s, n) => (
          <li key={s.title}>
            <span className="tc-path-n">{n + 1}</span>
            <div><b>{s.title}</b><small>{s.skills}</small></div>
          </li>
        ))}
      </ol>
      <div className="tc-path-roles">
        <span className="tc-eyebrow">Roles this leads to</span>
        <div>{t.roles.map((r) => <span key={r} className="tc-chip-static"><Icon name="briefcase" size="0.8rem" />{r}</span>)}</div>
      </div>
      <CourseLink interest={interest} />
    </div>
  )
}

/** Comparing institutes: what you get at Learnbay, with the projects you'd build and a link to your course. */
function WhyCard({ interest, programId }: { interest: string; programId?: string }) {
  const ids = ['customisation', 'projects', 'mentors', 'placement', 'domain'] as const
  const projects = projectsFor(programId, interest).slice(0, 3)
  return (
    <div className="tc-card tc-why">
      <span className="tc-eyebrow">What you get with Learnbay</span>
      <div className="tc-why-list">
        {ids.map((id) => (
          <div key={id} className="tc-why-item">
            <span className="tc-soft-icon"><Icon name={USPS[id].icon} size="1rem" /></span>
            <span><b>{USPS[id].title}</b><small>{USPS[id].short}</small></span>
          </div>
        ))}
      </div>
      <div className="tc-why-projects">
        <span className="tc-eyebrow">Projects you’d build</span>
        {projects.map((p) => <span key={p.title} className="tc-chip-static"><Icon name="folder" size="0.8rem" />{p.title}</span>)}
      </div>
      <PartnerLogos size={16} className="tc-proof-logos" />
      <CourseLink interest={interest} programId={programId} />
    </div>
  )
}

/**
 * The program's syllabus (2026 catalogue): length, modules and projects at a glance, then every module opens to show
 * its weeks, topics and the projects built in it. Short by default, detailed on tap.
 */
function CurriculumCard({ interest, programId }: { interest: string; programId?: string }) {
  const p = programId ? getProgram(programId) : programFor(interest)
  if (!p) return null
  const cur = curriculumOf(p.id)
  const modules = cur.moduleDetails
  const projectCount = modules.reduce((n, m) => n + m.projects.length, 0)
  const spec = cur.electives
  return (
    <div className="tc-card tc-curriculum tc-syllabus">
      <span className="tc-eyebrow">Syllabus · {p.name}</span>
      <div className="tc-cur-stats">
        {cur.jobReady && <span className="tc-ready"><Icon name="target" size="0.95rem" /><b>{cur.jobReady}</b><small>to job-ready</small></span>}
        <span><Icon name="book" size="0.95rem" /><b>{modules.length}</b><small>modules</small></span>
        {projectCount > 0 && <span><Icon name="folder" size="0.95rem" /><b>{projectCount}+</b><small>module projects</small></span>}
        {cur.projects.length > 0 && <span><Icon name="target" size="0.95rem" /><b>{cur.projects.length}</b><small>capstone options</small></span>}
      </div>
      {cur.durationMonths && <p className="tc-cur-length">Program length: {cur.durationMonths} months ({cur.totalWeeks} weeks).</p>}
      <ol className="tc-syl-list">
        {modules.map((m, n) => (
          <li key={m.name}>
            <details>
              <summary>
                <span className="tc-path-n">{n + 1}</span>
                <span className="tc-syl-name"><b>{m.name}</b>{m.weeks && /\d/.test(m.weeks) && <small>Weeks {m.weeks}</small>}</span>
                <Icon name="chevronDown" size="0.9rem" />
              </summary>
              <div className="tc-syl-body">
                {m.topics.length > 0 && !(m.topics.length === 1 && /^see specialisations/i.test(m.topics[0])) && (
                  <ul>{m.topics.map((t) => <li key={t}>{t}</li>)}</ul>
                )}
                {/^see specialisations/i.test(m.topics[0] ?? '') && spec.length > 0 && <p className="tc-syl-note">Pick from: {spec.join(' · ')}</p>}
                {m.projects.length > 0 && (
                  <div className="tc-syl-projects">
                    <span className="tc-eyebrow">You build</span>
                    {m.projects.map((x) => <span key={x} className="tc-chip-static"><Icon name="folder" size="0.8rem" />{x}</span>)}
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
      {spec.length > 0 && (
        <div className="tc-why-projects">
          <span className="tc-eyebrow">Specialisations / tracks</span>
          {spec.map((e) => <span key={e} className="tc-chip-static"><Icon name="target" size="0.8rem" />{e}</span>)}
        </div>
      )}
      {cur.certifications[0] && <div className="tc-cur-certs"><Icon name="award" size="0.9rem" /> {cur.certifications[0]}</div>}
      <CourseLink interest={interest} programId={p.id} label="Program page" />
    </div>
  )
}

/** Learnbay's published refund policy, in plain words, with the link to the full policy. */
type Co = { name: string; category: string; alumni: boolean }

/**
 * Companies: 15 well-known names first (where Learnbay alumni work), then the full list to browse and search.
 * "Alumni" marks only the companies Learnbay publishes as alumni employers; the rest hire for these roles in India.
 */
function CompaniesCard() {
  const [data, setData] = useState<{ claim: string; featured: Co[]; companies: Co[] } | null>(null)
  const [all, setAll] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => {
    void getJson('/api/companies').then((r) => { if (r.ok) setData(r.data as { claim: string; featured: Co[]; companies: Co[] }) })
  }, [])
  if (!data) return <div className="tc-card tc-companies"><span className="spinner" /> Loading companies…</div>
  const groups = (list: Co[]) => [...new Set(list.map((c) => c.category))]
  const term = q.trim().toLowerCase()
  const shown = term ? data.companies.filter((c) => c.name.toLowerCase().includes(term) || c.category.toLowerCase().includes(term)) : data.companies
  return (
    <div className="tc-card tc-companies">
      <span className="tc-eyebrow">{data.claim}</span>
      <b className="tc-card-title">{all ? `${data.companies.length} companies hiring for these roles` : 'A few of the companies our alumni work at'}</b>
      {!all && groups(data.featured).map((g) => (
        <div key={g} className="tc-co-group">
          <small>{g}</small>
          <div className="tc-co-list">{data.featured.filter((c) => c.category === g).map((c) => <span key={c.name} className="tc-co">{c.name}</span>)}</div>
        </div>
      ))}
      {all && (
        <>
          <input className="tc-note" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a company or sector, e.g. Microsoft, bank, GCC" aria-label="Search companies" />
          <div className="tc-co-all">
            {groups(shown).map((g) => (
              <div key={g} className="tc-co-group">
                <small>{g} · {shown.filter((c) => c.category === g).length}</small>
                <div className="tc-co-list">
                  {shown.filter((c) => c.category === g).map((c) => <span key={c.name} className={`tc-co${c.alumni ? ' alumni' : ''}`}>{c.name}{c.alumni && <em>Alumni</em>}</span>)}
                </div>
              </div>
            ))}
            {!shown.length && <p className="tc-co-note">No company matches “{q}”.</p>}
          </div>
          <p className="tc-co-note"><em className="tc-co-key">Alumni</em> Learnbay alumni work here (as published by Learnbay). Others are well-known companies hiring for tech, data, AI and cloud roles in India.</p>
        </>
      )}
      <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => { setAll(!all); setQ('') }}>
        {all ? 'Show fewer' : <>See all {data.companies.length} companies <Icon name="arrowRight" size="0.85rem" /></>}
      </button>
      <p className="tc-co-note">Placement support: mock interviews, resume build-up and interview calls once you’re job-ready. Where you land depends on your skills and interviews; no one can promise a specific company.</p>
    </div>
  )
}

function RefundCard() {
  const icons: IconName[] = ['calendar', 'checkCircle', 'rupee', 'refresh', 'mail']
  return (
    <div className="tc-card tc-why">
      <span className="tc-eyebrow">Refund & cancellation policy</span>
      <div className="tc-why-list">
        {REFUND_POLICY.points.map((pt, n) => (
          <div key={pt.title} className="tc-why-item">
            <span className="tc-soft-icon"><Icon name={icons[n] ?? 'checkCircle'} size="1rem" /></span>
            <span><b>{pt.title}</b><small>{pt.detail}</small></span>
          </div>
        ))}
      </div>
      <a href={REFUND_POLICY.url} target="_blank" rel="noopener noreferrer" className="tc-course-link"><b><i>Read the full refund policy</i></b> <Icon name="external" size="0.8rem" /></a>
    </div>
  )
}

/** The eligibility test, made hard to miss: what it is, how short it is and what it unlocks. */
function EligPushCard() {
  return (
    <div className="tc-card tc-elig-push">
      <span className="tc-elig-badge"><Icon name="award" size="1.2rem" /></span>
      <div>
        <b>Check your eligibility in 2 minutes</b>
        <ul>
          <li><Icon name="checkCircle" size="0.85rem" />10 quick questions, no maths</li>
          <li><Icon name="checkCircle" size="0.85rem" />See where you’d start in the program</li>
          <li><Icon name="checkCircle" size="0.85rem" />Then a Senior Counsellor can check scholarships for you on the call</li>
        </ul>
      </div>
    </div>
  )
}

/** Where the learner stands and what the counselling call settles: the decision, in one glance. */
function DecisionCard({ eligible, programId }: { eligible: boolean | null; programId?: string }) {
  const p = programId ? getProgram(programId) : null
  const rows: { icon: IconName; label: string; value: string; tone: 'ok' | 'todo' | 'info' }[] = [
    eligible === true ? { icon: 'checkCircle', label: 'Eligibility', value: 'You qualify', tone: 'ok' }
      : eligible === false ? { icon: 'route', label: 'Eligibility', value: 'Foundation first, then the program', tone: 'info' }
        : { icon: 'award', label: 'Eligibility', value: 'Not checked yet · 2 min', tone: 'todo' },
    ...(p ? [{ icon: 'book' as IconName, label: 'Program', value: p.name, tone: 'info' as const }] : []),
    { icon: 'calendar', label: 'Counselling call confirms', value: 'Batch and seats · fee and EMI · scholarship (only a Senior Counsellor can activate one)', tone: 'info' },
  ]
  return (
    <div className="tc-card tc-decision">
      <span className="tc-eyebrow">Your next step</span>
      {rows.map((r) => (
        <div key={r.label} className={`tc-decision-row ${r.tone}`}>
          <Icon name={r.icon} size="1rem" />
          <span><small>{r.label}</small><b>{r.value}</b></span>
        </div>
      ))}
    </div>
  )
}

/** Skills and levels in one step: every tool the target role needs, each rated Basic / Intermediate / Advanced (or left blank). */
function SkillMatrixCard({ skills, live, onDone }: { skills: { id: string; label: string }[]; live: boolean; onDone: Done }) {
  const [levels, setLevels] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const LEVELS = [{ id: 'beginner', label: 'Basic' }, { id: 'intermediate', label: 'Intermediate' }, { id: 'advanced', label: 'Advanced' }]
  const rated = skills.filter((s) => levels[s.id])
  if (!live || sent) {
    return (
      <div className="tc-card tc-matrix-done">
        {rated.length
          ? rated.map((s) => <span key={s.id} className={`tc-lv tc-lv-${levels[s.id]}`}>{s.label} · {LEVELS.find((l) => l.id === levels[s.id])?.label}</span>)
          : <span className="tc-lv">New to all of these</span>}
      </div>
    )
  }
  const pick = (id: string, level: string) => setLevels((v) => {
    const next = { ...v }
    if (next[id] === level) delete next[id]
    else next[id] = level
    return next
  })
  return (
    <div className="tc-card tc-matrix">
      <div className="tc-matrix-head"><span>Tap your level for each one. Leave it blank if you haven’t used it.</span></div>
      {skills.map((s) => (
        <div key={s.id} className={`tc-matrix-row ${levels[s.id] ? 'on' : ''}`}>
          <span className="tc-matrix-skill">{s.label}</span>
          <div className="tc-matrix-seg" role="radiogroup" aria-label={`${s.label}: your level`}>
            {LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={levels[s.id] === l.id} className={`tc-lv-${l.id}`} onClick={() => pick(s.id, l.id)}>{l.label}</button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="tc-btn tc-btn-primary tc-btn-sm" onClick={() => {
        setSent(true)
        const ids = skills.filter((s) => levels[s.id]).map((s) => s.id)
        onDone({ skills: ids, levels })
      }}>
        {rated.length ? `Done · ${rated.length} rated` : 'I’m new to all of these'} <Icon name="arrowRight" size="0.9rem" />
      </button>
    </div>
  )
}

/** The roles this path opens for them, and how we think about pay (a target, never a promise). */
function RolesCard({ roles, note }: { roles: string[]; note: string | null }) {
  return (
    <div className="tc-card tc-roles">
      <span className="tc-eyebrow">Roles you can aim for</span>
      <div className="tc-roles-list">
        {roles.map((r, n) => (
          <span key={r} className="tc-role"><span className="tc-path-n">{n + 1}</span><b>{r}</b></span>
        ))}
      </div>
      {note && <p className="tc-roles-note"><Icon name="trend" size="0.9rem" /> {note}</p>}
    </div>
  )
}

/** How well each program fits the learner (out of 10), best first, with the reasons. */
function FitCard({ rows }: { rows: { programId: string; name: string; score: number; reasons: string[] }[] }) {
  return (
    <div className="tc-card tc-fit">
      <span className="tc-eyebrow">How well each option fits you</span>
      {rows.map((r, n) => (
        <div key={r.programId} className={`tc-fit-row ${n === 0 ? 'best' : ''}`}>
          <div className="tc-fit-top">
            <b>{r.name}</b>
            <span className="tc-fit-score">{r.score}/10{n === 0 ? ' · Best fit' : ''}</span>
          </div>
          <div className="tc-fit-bar" aria-hidden="true"><i style={{ width: `${r.score * 10}%` }} /></div>
          {r.reasons.length > 0 && <small>{r.reasons.join(' · ')}</small>}
        </div>
      ))}
    </div>
  )
}

/** Their best-fit path from Learnbay's Lead–Course Map: the lead type they match, then Recommended, Next best and One more option. */
function PathCard({ data }: { data: PathCardData }) {
  return (
    <div className="tc-card tc-path">
      <span className="tc-eyebrow">Your best-fit path · Learnbay’s course map</span>
      <div className="tc-path-who">
        <div>
          <small>Your profile matches</small>
          <b>{data.persona}</b>
        </div>
        <span className="tc-path-match" aria-label={`${data.match}% match`}>{data.match}%<small>match</small></span>
      </div>
      {data.reasons.length > 0 && <div className="tc-path-reasons">{data.reasons.map((r) => <span key={r}><Icon name="check" size="0.75rem" />{r}</span>)}</div>}
      <ol className="tc-path-list">
        {data.options.map((o, n) => (
          <li key={o.programId} className={`tc-path-row ${o.kind}${o.later ? ' later' : ''}`}>
            <span className="tc-path-step" aria-hidden="true">{n + 1}</span>
            <div className="tc-path-body">
              <span className="tc-path-kind">{n === 0 ? pathKindLabel(o.kind) : 'Or'}</span>
              <div className="tc-path-top"><b>{o.name}</b><span className="tc-path-fit">{o.fit}/10</span></div>
              <div className="tc-fit-bar" aria-hidden="true"><i style={{ width: `${o.fit * 10}%` }} /></div>
              <small>{o.why}</small>
              {o.note && <small className="tc-path-note"><Icon name={o.later ? 'clock' : 'alert'} size="0.75rem" />{o.note}</small>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The brochure's "Is this transition realistic?" section, personal: you have ✓ + just add + → the role you step into. */
function BridgeCard({ have, add, role, readiness, program }: { have: string[]; add: string[]; role: string; readiness: number | null; program: string }) {
  return (
    <div className="tc-card tc-bridge">
      <span className="tc-eyebrow">Is this transition realistic for you?</span>
      <b className="tc-bridge-yes">Yes. You’re not starting from zero: you’re upgrading what you already have.</b>
      <div className="tc-bridge-cols">
        <div className="tc-bridge-col have">
          <span className="tc-bridge-label">You have</span>
          {have.map((h) => <span key={h} className="tc-bridge-item"><Icon name="check" size="0.8rem" />{h}</span>)}
        </div>
        <span className="tc-bridge-plus" aria-hidden="true">+</span>
        <div className="tc-bridge-col add">
          <span className="tc-bridge-label">Just add{program ? ` · ${program}` : ''}</span>
          {add.map((s) => <span key={s} className="tc-bridge-item"><Icon name="plus" size="0.8rem" />{s}</span>)}
        </div>
      </div>
      {readiness !== null && (
        <div className="tc-bridge-meter" aria-label={`Your readiness today ${readiness}%, full with the program`}>
          <div className="tc-bridge-bar"><i style={{ width: `${Math.max(8, Math.min(100, readiness))}%` }} /><em /></div>
          <div className="tc-bridge-scale"><span>You today · {readiness}% ready</span><span>With the program · job-ready</span></div>
        </div>
      )}
      <div className="tc-bridge-to"><Icon name="arrowRight" size="0.9rem" /> You step into: <b>{role}</b></div>
    </div>
  )
}
