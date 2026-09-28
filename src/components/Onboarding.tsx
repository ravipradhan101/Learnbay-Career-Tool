'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from './Icon'
import { track } from '@/lib/analytics'
import { getTool } from '@/lib/tools-meta'
import { postJson, storageGet, storageRemove, storageSet } from '@/lib/client'
import {
  COUNTRY_CODES, EXPERIENCE, INTERESTS, PROGRAMMER, ROLES, ROLE_OTHER, isValidPhone, type Answers,
} from '@/lib/questions'

const STORAGE_KEY = 'lcn_onboard_v2'
const SOURCE_KEY = 'lcn_source'
const TOTAL = 4
/** Step names used in the admin funnel report. */
const STEP_NAMES = ['', 'role', 'experience', 'programmer', 'interest', 'contact']

type SignedIn = { email: string; name: string; phoneCountry: string; phone: string } | null
type Contact = { name: string; email: string; phoneCountry: string; phone: string; consent: boolean }

const ROLE_ICONS: Record<string, IconName> = {
  'software-engineer': 'code', 'qa-engineer': 'bug', 'data-analyst': 'database', 'devops-cloud': 'cloud',
  'product-manager': 'cube', 'business-non-tech': 'users', student: 'award',
}
const INTEREST_ICONS: Record<string, IconName> = { ai: 'sparkles', 'cloud-devops': 'cloud', fde: 'briefcase', 'data-science': 'chart', analytics: 'database' }
const PROGRAMMER_ICONS: Record<string, IconName> = { yes: 'code', some: 'file', no: 'users' }

function captureSource() {
  try {
    if (window.sessionStorage.getItem(SOURCE_KEY)) return
    const params = new URLSearchParams(window.location.search)
    const src: Record<string, string> = {}
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = params.get(key)
      if (v) src[key] = v.slice(0, 200)
    }
    if (document.referrer) src.referrer = document.referrer.slice(0, 200)
    src.landing = window.location.pathname
    window.sessionStorage.setItem(SOURCE_KEY, JSON.stringify(src))
  } catch {
    // ignore
  }
}

export function Onboarding({ next, signedIn, initial }: { next: string; signedIn: SignedIn; initial: Answers }) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<Answers>(initial)
  const [contact, setContact] = useState<Contact>({
    name: signedIn?.name ?? '', email: signedIn?.email ?? '', phoneCountry: signedIn?.phoneCountry || '+91', phone: signedIn?.phone ?? '', consent: false,
  })
  const [hydrated, setHydrated] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  useEffect(() => {
    captureSource()
    const saved = storageGet<{ answers: Answers; step: number; contact?: Partial<Contact> }>(STORAGE_KEY)
    if (saved?.answers) {
      setAnswers((a) => ({ ...saved.answers, ...a }))
      if (saved.step >= 1 && saved.step <= TOTAL + 1) setStep(saved.step)
      if (saved.contact && !signedIn) setContact((c) => ({ ...c, name: saved.contact?.name ?? '', email: saved.contact?.email ?? '', phone: saved.contact?.phone ?? '', phoneCountry: saved.contact?.phoneCountry ?? '+91' }))
    }
    setHydrated(true)
  }, [signedIn])

  useEffect(() => {
    if (!hydrated) return
    storageSet(STORAGE_KEY, { answers, step, contact: { name: contact.name, email: contact.email, phone: contact.phone, phoneCountry: contact.phoneCountry } })
  }, [answers, step, contact, hydrated])

  useEffect(() => {
    if (hydrated) track('step_view', `onboarding:${STEP_NAMES[step]}`, { step })
  }, [step, hydrated])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const card = cardRef.current
    if (card && card.getBoundingClientRect().top < 72) card.scrollIntoView({ block: 'start', behavior: 'smooth' })
    card?.querySelector<HTMLElement>('[data-step-heading]')?.focus({ preventScroll: true })
  }, [step])

  // Single-choice questions advance by themselves: one tap per question.
  const choose = (patch: Partial<Answers>, advance = true) => {
    const [key, value] = Object.entries(patch)[0] ?? []
    if (key) track('step_answer', `onboarding:${key}`, { value: String(value) })
    setAnswers((a) => ({ ...a, ...patch }))
    if (advance) window.setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL + 1)), 180)
  }

  const onDone = (redirect: string) => {
    storageRemove(STORAGE_KEY)
    window.location.href = redirect
  }

  return (
    <div className="onboard-card" ref={cardRef}>
      {step <= TOTAL && (
        <div className="steps-top">
          {step > 1 && (
            <button type="button" className="icon-btn" aria-label="Back" onClick={() => { track('step_back', `onboarding:${STEP_NAMES[step]}`); setStep((s) => s - 1) }} style={{ width: '2rem', height: '2rem' }}>
              <Icon name="arrowLeft" size="1.1rem" />
            </button>
          )}
          <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label="Quick start progress">
            <i style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>
          <span className="progress-count">{step}/{TOTAL}</span>
        </div>
      )}

      {step === 1 && (
        <>
          <Head title="What is your current role?" sub="Tap the one that fits best." />
          <div className="tile-grid" role="radiogroup" aria-label="Current role">
            {ROLES.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={answers.role === o.id} className="tile" onClick={() => choose({ role: o.id, roleOther: undefined })}>
                <span className="fc-icon"><Icon name={ROLE_ICONS[o.id] ?? 'briefcase'} /></span>
                {o.label}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={answers.role === ROLE_OTHER} className="tile" onClick={() => choose({ role: ROLE_OTHER }, false)}>
              <span className="fc-icon"><Icon name="plus" /></span>
              Other
            </button>
          </div>
          {answers.role === ROLE_OTHER && (
            <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (answers.roleOther?.trim()) { track('step_answer', 'onboarding:role', { value: 'other' }); setStep(2) } }}>
              <label className="sr-only" htmlFor="role-other">Your role</label>
              <input id="role-other" className="input" maxLength={60} autoFocus placeholder="e.g. Business Analyst" value={answers.roleOther ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, roleOther: e.target.value }))} />
              <button className="btn btn-primary" disabled={!answers.roleOther?.trim()}>Next</button>
            </form>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <Head title="How many years of experience do you have?" sub="Total work experience." />
          <div className="chip-grid" role="radiogroup" aria-label="Years of experience">
            {EXPERIENCE.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={answers.experience === o.id} className="chip" onClick={() => choose({ experience: o.id })}>{o.label}</button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Head title="Do you write code in your work?" sub="This shapes which path and program suit you." />
          <div className="option-list" role="radiogroup" aria-label="Coding background">
            {PROGRAMMER.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={answers.programmer === o.id} className="option" onClick={() => choose({ programmer: o.id })}>
                <span className="option-icon"><Icon name={PROGRAMMER_ICONS[o.id]} /></span>
                <span>{o.label}<span className="hint">{o.hint}</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <Head title="Which program area are you looking for?" sub="Pick the one you are most interested in." />
          <div className="option-list" role="radiogroup" aria-label="Program area">
            {INTERESTS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={answers.interest === o.id} className="option" onClick={() => choose({ interest: o.id })}>
                <span className="option-icon"><Icon name={INTEREST_ICONS[o.id]} /></span>
                <span>{o.label}<span className="hint">{o.hint}</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === TOTAL + 1 && (
        <ContactStep answers={answers} contact={contact} setContact={setContact} signedIn={signedIn} next={next} onBack={() => { track('step_back', 'onboarding:contact'); setStep(TOTAL) }} onDone={onDone} />
      )}
    </div>
  )
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="q-title" tabIndex={-1} data-step-heading>{title}</h1>
      <p className="q-sub">{sub}</p>
    </div>
  )
}

function ContactStep({ answers, contact, setContact, signedIn, next, onBack, onDone }: {
  answers: Answers
  contact: Contact
  setContact: React.Dispatch<React.SetStateAction<Contact>>
  signedIn: SignedIn
  next: string
  onBack: () => void
  onDone: (redirect: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [info, setInfo] = useState('')
  const [existing, setExisting] = useState(false)
  const phone = contact.phone.replace(/[\s-]/g, '')
  const missing = !answers.role || !answers.experience || !answers.programmer || !answers.interest

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const invalid = (field: string, message: string) => { track('error', `contact:${field}`); setError(message) }
    if (missing) return invalid('questions', 'Please answer the four quick questions first.')
    if (contact.name.trim().length < 2) return invalid('name', 'Please enter your full name.')
    if (!/\S+@\S+\.\S+/.test(contact.email)) return invalid('email', 'Please enter a valid email address.')
    if (!isValidPhone(contact.phoneCountry, phone)) return invalid('phone', 'Please enter a valid phone number.')
    if (!contact.consent) return invalid('consent', 'Please agree so we can share your insights with you.')
    setBusy(true)
    setError('')
    let source: Record<string, string> = {}
    try { source = JSON.parse(window.sessionStorage.getItem(SOURCE_KEY) ?? '{}') } catch { /* ignore */ }
    const res = await postJson('/api/onboarding', { answers, contact: { ...contact, phone }, source, next })
    if (!res.ok) { setBusy(false); track('error', 'contact:server', { status: res.status }); return setError(res.error) }
    if (res.data.needsOtp) {
      const email = String(res.data.email)
      const isExisting = Boolean(res.data.existing)
      track('action', isExisting ? 'onboarding_existing_email' : 'onboarding_completed')
      setExisting(isExisting)
      setOtp(email)
      await sendCode(email, isExisting)
      setBusy(false)
      return
    }
    track('action', 'onboarding_completed')
    onDone(String(res.data.redirect ?? '/dashboard'))
  }

  // First focus of each contact field shows how far people get before they stop (values are never recorded).
  const focused = useRef(new Set<string>())
  function fieldFocus(el: EventTarget) {
    const field = el instanceof HTMLElement ? (el.id || el.getAttribute('aria-label') || '') : ''
    if (!field || focused.current.has(field)) return
    focused.current.add(field)
    track('action', 'contact_field_focus', { field })
  }

  async function sendCode(email: string, isExisting = existing) {
    const r = await postJson('/api/auth/request-otp', { email })
    if (!r.ok) setError(r.error)
    else setInfo(isExisting
      ? `You already have an account. Enter the 6-digit code we sent to ${email}.`
      : `One last step: we sent a 6-digit code to ${email}. Enter it to confirm your email and open your Career Studio. Can't find it? Check Promotions or Spam.`)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!otp) return
    setBusy(true)
    setError('')
    const r = await postJson('/api/auth/verify-otp', { email: otp, code })
    if (!r.ok) { setBusy(false); track('error', 'contact:otp'); return setError(r.error) }
    track('action', existing ? 'login_completed' : 'email_verified')
    if (r.data.onboarded) return onDone(next === 'sessions' ? '/dashboard/sessions' : getTool(next)?.route ?? '/dashboard')
    setOtp(null)
    await submit()
  }

  if (otp) {
    return (
      <form className="stack" onSubmit={verify} noValidate>
        <Head title={existing ? 'Welcome back' : 'Confirm your email'} sub={info || `We sent a 6-digit code to ${otp}.`} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="sr-only" htmlFor="ob-otp">6-digit code</label>
        <input id="ob-otp" className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || code.length !== 6}>
          {busy ? <span className="spinner" /> : <>{existing ? 'Log in' : 'Confirm & open my Career Studio'}</>}
        </button>
        <div className="row between">
          <button type="button" className="link-btn small" onClick={() => { setOtp(null); setCode(''); setError('') }}>Use a different email</button>
          <button type="button" className="link-btn small" onClick={() => sendCode(otp)}>Resend code</button>
        </div>
      </form>
    )
  }

  return (
    <form className="stack" onSubmit={submit} noValidate onFocus={(e) => fieldFocus(e.target)}>
      <div className="steps-top">
        <button type="button" className="icon-btn" aria-label="Back" onClick={onBack} style={{ width: '2rem', height: '2rem' }}><Icon name="arrowLeft" size="1.1rem" /></button>
        <div className="progress" aria-hidden="true"><i style={{ width: '100%' }} /></div>
        <span className="progress-count text-success" style={{ fontWeight: 600 }}>Done!</span>
      </div>
      <Head title="Great! Where should we send your insights?" sub="Your Career Studio opens right after this." />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="field">
        <label className="label" htmlFor="c-name">Full name</label>
        <input id="c-name" className="input" autoComplete="name" maxLength={80} value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Rahul Kumar" />
      </div>
      <div className="field">
        <label className="label" htmlFor="c-email">Email address</label>
        <input id="c-email" className="input" type="email" inputMode="email" autoComplete="email" maxLength={254} readOnly={Boolean(signedIn)}
          value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} placeholder="you@example.com" />
      </div>
      <div className="field">
        <label className="label" htmlFor="c-phone">Phone number</label>
        <div className="phone-row">
          <select aria-label="Country code" className="select" value={contact.phoneCountry} onChange={(e) => setContact((c) => ({ ...c, phoneCountry: e.target.value }))}>
            {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input id="c-phone" className="input" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14}
            value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value.replace(/[^\d\s-]/g, '') }))} placeholder="98765 43210" />
        </div>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={contact.consent} onChange={(e) => setContact((c) => ({ ...c, consent: e.target.checked }))} />
        <span>I agree to receive my personalized insights and relevant learning resources via email and WhatsApp, and to be contacted by Learnbay.</span>
      </label>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? <span className="spinner" /> : <>Open my Career Studio</>}
      </button>
      <p className="secure-note"><Icon name="lock" size="0.9rem" /> Your information is secure with us</p>
    </form>
  )
}
