'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '../Icon'
import { Robot } from '../Robot'
import { GeneratingView } from '../GeneratingView'
import { SaveProgressModal } from './SaveProgressModal'
import { postJson, storageGet, storageRemove, storageSet } from '@/lib/client'
import {
  CHALLENGES, CHALLENGE_OTHERS, COUNTRY_CODES, CTC_BANDS, EMPTY_ANSWERS, EXPERIENCE, GOALS, INDUSTRIES, MAX_GOALS,
  ROLES, ROLE_OTHER, SITUATIONS, SKILLS, SKILL_NONE, SKILL_OTHERS, WEEKLY_HOURS, isValidPhone, type Answers,
} from '@/lib/questions'

const STORAGE_KEY = 'lcn_wizard_v1'
const SOURCE_KEY = 'lcn_source'
const QUESTION_COUNT = 7
const CONTACT_STEP = 8
const GENERATING_STEP = 9

type SignedIn = { email: string; name: string; phoneCountry: string; phone: string } | null
type Contact = { name: string; email: string; phoneCountry: string; phone: string; consent: boolean }

const ROLE_ICONS: Record<string, IconName> = {
  'software-engineer': 'code',
  'qa-engineer': 'bug',
  'data-analyst': 'database',
  'devops-cloud': 'cloud',
  'product-manager': 'cube',
  'business-non-tech': 'users',
}

const WELCOME_ITEMS: { icon: IconName; text: string }[] = [
  { icon: 'target', text: 'Career direction & best fit roles' },
  { icon: 'chart', text: 'Skill gap analysis' },
  { icon: 'route', text: 'Personalized learning roadmap' },
  { icon: 'folder', text: 'Project & portfolio ideas' },
  { icon: 'rupee', text: 'Salary insights (market benchmark)' },
  { icon: 'book', text: 'Resources, tutorials and case studies' },
]

function readSource(): Record<string, string> {
  const cached = (() => {
    try {
      const raw = window.sessionStorage.getItem(SOURCE_KEY)
      return raw ? (JSON.parse(raw) as Record<string, string>) : null
    } catch {
      return null
    }
  })()
  if (cached) return cached
  const params = new URLSearchParams(window.location.search)
  const src: Record<string, string> = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    const v = params.get(key)
    if (v) src[key] = v.slice(0, 200)
  }
  if (document.referrer) src.referrer = document.referrer.slice(0, 200)
  src.landing = window.location.pathname
  try {
    window.sessionStorage.setItem(SOURCE_KEY, JSON.stringify(src))
  } catch {
    // ignore
  }
  return src
}

export function Wizard({ signedIn, resumed, resumeLinkInvalid }: {
  signedIn: SignedIn
  resumed: { answers: Answers; step: number; email: string } | null
  resumeLinkInvalid: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState(resumed ? Math.min(Math.max(resumed.step, 1), CONTACT_STEP) : 0)
  const [answers, setAnswers] = useState<Answers>(resumed?.answers ?? EMPTY_ANSWERS)
  const [contact, setContact] = useState<Contact>({
    name: signedIn?.name ?? '',
    email: signedIn?.email ?? resumed?.email ?? '',
    phoneCountry: signedIn?.phoneCountry || '+91',
    phone: signedIn?.phone ?? '',
    consent: false,
  })
  const [hydrated, setHydrated] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const promptShown = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Restore in-progress answers saved on this device (unless a resume link supplied them).
  useEffect(() => {
    readSource()
    if (!resumed) {
      const saved = storageGet<{ answers: Answers; step: number; contact?: Partial<Contact> }>(STORAGE_KEY)
      if (saved?.answers) {
        setAnswers({ ...EMPTY_ANSWERS, ...saved.answers })
        if (typeof saved.step === 'number' && saved.step > 0 && saved.step <= CONTACT_STEP) setStep(saved.step)
        if (saved.contact && !signedIn) setContact((c) => ({ ...c, name: saved.contact?.name ?? c.name, email: saved.contact?.email ?? c.email, phone: saved.contact?.phone ?? c.phone, phoneCountry: saved.contact?.phoneCountry ?? c.phoneCountry }))
      }
    }
    try {
      promptShown.current = window.sessionStorage.getItem('lcn_save_prompt') === '1'
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [resumed, signedIn])

  useEffect(() => {
    if (!hydrated || step >= GENERATING_STEP) return
    storageSet(STORAGE_KEY, { answers, step, contact: { name: contact.name, email: contact.email, phone: contact.phone, phoneCountry: contact.phoneCountry } })
  }, [answers, step, contact, hydrated])

  const firstStepRender = useRef(true)
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false
      return
    }
    const card = cardRef.current
    if (card && card.getBoundingClientRect().top < 72) card.scrollIntoView({ block: 'start', behavior: 'smooth' })
    const heading = cardRef.current?.querySelector<HTMLElement>('[data-step-heading]')
    heading?.focus({ preventScroll: true })
  }, [step])

  // "Don't lose your progress" prompt: exit intent on desktop, or 60s idle mid-questionnaire.
  const openSavePrompt = useCallback(() => {
    if (promptShown.current || signedIn) return
    promptShown.current = true
    try {
      window.sessionStorage.setItem('lcn_save_prompt', '1')
    } catch {
      // ignore
    }
    setSaveOpen(true)
  }, [signedIn])

  useEffect(() => {
    if (!hydrated || signedIn || step < 2 || step >= CONTACT_STEP) return
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) openSavePrompt()
    }
    let timer = window.setTimeout(openSavePrompt, 60_000)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(openSavePrompt, 60_000)
    }
    document.addEventListener('mouseout', onLeave)
    window.addEventListener('pointerdown', reset)
    window.addEventListener('keydown', reset)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseout', onLeave)
      window.removeEventListener('pointerdown', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [hydrated, signedIn, step, openSavePrompt])

  const update = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }))
  const next = () => setStep((s) => Math.min(s + 1, CONTACT_STEP))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  if (step === GENERATING_STEP) {
    return (
      <div className="wizard-card" ref={cardRef}>
        <GeneratingView name={contact.name.split(' ')[0] || 'there'} onReady={() => { storageRemove(STORAGE_KEY); router.replace('/dashboard?welcome=1') }} />
      </div>
    )
  }

  const canContinue = (() => {
    switch (step) {
      case 1: return Boolean(answers.situation)
      case 2: return Boolean(answers.role) && (answers.role !== ROLE_OTHER || Boolean(answers.roleOther?.trim()))
      case 3: return Boolean(answers.experience && answers.industry)
      case 4: return answers.skills.length > 0
      case 5: return answers.goals.length > 0
      case 6: return answers.challenges.length > 0
      case 7: return Boolean(answers.weeklyHours)
      default: return true
    }
  })()

  return (
    <div className="wizard-card" ref={cardRef}>
      {resumeLinkInvalid && step === 0 && (
        <p className="form-error">That link has expired. Your answers on this device are still here if you started before.</p>
      )}
      {step === 0 && <Welcome onStart={() => setStep(1)} />}
      {step > 0 && step <= QUESTION_COUNT && (
        <>
          <div className="wizard-top">
            <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={QUESTION_COUNT} aria-valuenow={step} aria-label="Questions answered">
              <i style={{ width: `${(step / QUESTION_COUNT) * 100}%` }} />
            </div>
            <span className="progress-count">{step}/{QUESTION_COUNT}</span>
          </div>
          {step === 1 && <QSituation answers={answers} update={update} />}
          {step === 2 && <QRole answers={answers} update={update} />}
          {step === 3 && <QExperience answers={answers} update={update} />}
          {step === 4 && <QSkills answers={answers} update={update} />}
          {step === 5 && <QGoals answers={answers} update={update} />}
          {step === 6 && <QChallenges answers={answers} update={update} />}
          {step === 7 && <QHours answers={answers} update={update} />}
          <div className="wizard-footer">
            <button type="button" className="btn btn-outline" onClick={back}>
              <Icon name="arrowLeft" size="1rem" /> Back
            </button>
            <button type="button" className="btn btn-primary" onClick={next} disabled={!canContinue}>
              {step === QUESTION_COUNT ? 'Get My Results' : 'Continue'} <Icon name="arrowRight" size="1rem" />
            </button>
          </div>
          <p className="wizard-skip">
            <button type="button" className="link-btn" onClick={next}>Skip this question</button>
          </p>
        </>
      )}
      {step === CONTACT_STEP && (
        <ContactStep
          contact={contact}
          setContact={setContact}
          signedIn={signedIn}
          answers={answers}
          onBack={back}
          onSubmitted={() => setStep(GENERATING_STEP)}
          onAlreadyDone={() => { storageRemove(STORAGE_KEY); router.replace('/dashboard') }}
        />
      )}
      {saveOpen && (
        <SaveProgressModal
          percent={Math.round((step / (QUESTION_COUNT + 1)) * 100)}
          answers={answers}
          step={step}
          defaultEmail={contact.email}
          onClose={() => setSaveOpen(false)}
          onSaved={(email) => setContact((c) => ({ ...c, email }))}
        />
      )}
    </div>
  )
}

// ---------- Screens ----------

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="welcome">
        <div className="stack">
          <h1 tabIndex={-1} data-step-heading>Hi! I&apos;m your AI Career Navigator <span aria-hidden="true">👋</span></h1>
          <p className="muted">I&apos;ll ask a few quick questions to understand your background and goals, then create your personalized career roadmap.</p>
          <ul className="welcome-list">
            {WELCOME_ITEMS.map((i) => (
              <li key={i.text}><span className="fc-icon"><Icon name={i.icon} size="1rem" /></span>{i.text}</li>
            ))}
          </ul>
        </div>
        <Robot className="welcome-robot" />
      </div>
      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onStart}>
        Let&apos;s Get Started <Icon name="arrowRight" size="1.1rem" />
      </button>
      <p className="fineprint">Takes just 2-3 minutes • You can skip any question</p>
    </>
  )
}

type QProps = { answers: Answers; update: (p: Partial<Answers>) => void }

function QHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="q-title" tabIndex={-1} data-step-heading>{title}</h1>
      <p className="q-sub">{sub}</p>
    </div>
  )
}

function RadioOption({ checked, onSelect, label, hint, icon }: { checked: boolean; onSelect: () => void; label: string; hint?: string; icon?: IconName }) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="option" onClick={onSelect}>
      {icon ? <span className="option-icon"><Icon name={icon} /></span> : <span className="option-mark">{checked && <Icon name="check" size="0.8rem" />}</span>}
      <span>{label}{hint && <span className="hint">{hint}</span>}</span>
    </button>
  )
}

function CheckOption({ checked, onToggle, label, hint, disabled }: { checked: boolean; onToggle: () => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={checked} className="option" onClick={onToggle} disabled={disabled} style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
      <span className="option-mark square">{checked && <Icon name="check" size="0.8rem" />}</span>
      <span>{label}{hint && <span className="hint">{hint}</span>}</span>
    </button>
  )
}

function QSituation({ answers, update }: QProps) {
  const icons: IconName[] = ['trend', 'refresh', 'sparkles', 'bulb', 'briefcase', 'award']
  return (
    <>
      <QHead title="What best describes your current situation?" sub="Choose the option that fits you the most." />
      <div className="option-list" role="radiogroup" aria-label="Current situation">
        {SITUATIONS.map((o, i) => (
          <RadioOption key={o.id} icon={icons[i]} label={o.label} checked={answers.situation === o.id} onSelect={() => update({ situation: o.id })} />
        ))}
      </div>
    </>
  )
}

function QRole({ answers, update }: QProps) {
  return (
    <>
      <QHead title="What is your current role?" sub="Select the option that best matches." />
      <div className="tile-grid" role="radiogroup" aria-label="Current role">
        {ROLES.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={answers.role === o.id} className="tile" onClick={() => update({ role: o.id, roleOther: undefined })}>
            <span className="fc-icon"><Icon name={ROLE_ICONS[o.id] ?? 'briefcase'} /></span>
            {o.label}
          </button>
        ))}
      </div>
      <div className="option-list">
        <RadioOption icon="plus" label="Other (Please specify)" checked={answers.role === ROLE_OTHER} onSelect={() => update({ role: ROLE_OTHER })} />
        {answers.role === ROLE_OTHER && (
          <div className="field">
            <label className="label" htmlFor="role-other">Your role</label>
            <input id="role-other" className="input" maxLength={60} value={answers.roleOther ?? ''} onChange={(e) => update({ roleOther: e.target.value })} placeholder="e.g. Business Analyst" autoFocus />
          </div>
        )}
      </div>
    </>
  )
}

function QExperience({ answers, update }: QProps) {
  return (
    <>
      <QHead title="Tell us about your experience and industry." sub="This helps us personalize your insights." />
      <div className="stack">
        <div className="field">
          <label className="label" htmlFor="q-exp">Years of Experience</label>
          <select id="q-exp" className="select" value={answers.experience ?? ''} onChange={(e) => update({ experience: e.target.value || undefined })}>
            <option value="">Select years of experience</option>
            {EXPERIENCE.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="q-industry">Industry / Domain</label>
          <select id="q-industry" className="select" value={answers.industry ?? ''} onChange={(e) => update({ industry: e.target.value || undefined })}>
            <option value="">Select your industry</option>
            {INDUSTRIES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="q-ctc">Current Annual CTC (Optional)</label>
          <select id="q-ctc" className="select" value={answers.ctc ?? ''} onChange={(e) => update({ ctc: e.target.value || undefined })}>
            <option value="">Select your CTC range</option>
            {CTC_BANDS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </>
  )
}

function QSkills({ answers, update }: QProps) {
  const toggle = (id: string) => {
    if (id === SKILL_NONE) return update({ skills: answers.skills.includes(SKILL_NONE) ? [] : [SKILL_NONE], skillsOther: undefined })
    const without = answers.skills.filter((s) => s !== SKILL_NONE)
    update({ skills: without.includes(id) ? without.filter((s) => s !== id) : [...without, id] })
  }
  return (
    <>
      <QHead title="Which skills or tools are you comfortable with?" sub="Select all that apply." />
      <div className="chip-grid">
        {SKILLS.map((o) => (
          <button key={o.id} type="button" className="chip" aria-pressed={answers.skills.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</button>
        ))}
        <button type="button" className="chip" aria-pressed={answers.skills.includes(SKILL_NONE)} onClick={() => toggle(SKILL_NONE)}>None of the above</button>
        <button type="button" className="chip" aria-pressed={answers.skills.includes(SKILL_OTHERS)} onClick={() => toggle(SKILL_OTHERS)}>Others</button>
      </div>
      {answers.skills.includes(SKILL_OTHERS) && (
        <div className="field">
          <label className="label" htmlFor="skills-other">Other skills or tools</label>
          <input id="skills-other" className="input" maxLength={80} value={answers.skillsOther ?? ''} onChange={(e) => update({ skillsOther: e.target.value })} placeholder="e.g. Selenium, Power BI" />
        </div>
      )}
    </>
  )
}

function QGoals({ answers, update }: QProps) {
  const toggle = (id: string) => {
    if (answers.goals.includes(id)) return update({ goals: answers.goals.filter((g) => g !== id) })
    if (answers.goals.length >= MAX_GOALS) return
    update({ goals: [...answers.goals, id] })
  }
  const icons: IconName[] = ['sparkles', 'code', 'trend', 'rupee', 'bulb']
  return (
    <>
      <QHead title="What are you most interested in doing in the next 1-2 years?" sub="Select up to two options." />
      <div className="option-list">
        {GOALS.map((o, i) => {
          const checked = answers.goals.includes(o.id)
          return (
            <button key={o.id} type="button" aria-pressed={checked} className="option" onClick={() => toggle(o.id)}
              disabled={!checked && answers.goals.length >= MAX_GOALS} style={!checked && answers.goals.length >= MAX_GOALS ? { opacity: 0.55 } : undefined}>
              <span className="option-icon"><Icon name={icons[i]} /></span>
              <span>{o.label}{o.hint && <span className="hint">{o.hint}</span>}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function QChallenges({ answers, update }: QProps) {
  const toggle = (id: string) =>
    update({ challenges: answers.challenges.includes(id) ? answers.challenges.filter((c) => c !== id) : [...answers.challenges, id] })
  return (
    <>
      <QHead title="What is your biggest challenge right now?" sub="Select all that apply." />
      <div className="option-list">
        {CHALLENGES.map((o) => (
          <CheckOption key={o.id} label={o.label} checked={answers.challenges.includes(o.id)} onToggle={() => toggle(o.id)} />
        ))}
        <CheckOption label="Others" checked={answers.challenges.includes(CHALLENGE_OTHERS)} onToggle={() => toggle(CHALLENGE_OTHERS)} />
        {answers.challenges.includes(CHALLENGE_OTHERS) && (
          <div className="field">
            <label className="label" htmlFor="challenge-other">Tell us more</label>
            <input id="challenge-other" className="input" maxLength={120} value={answers.challengesOther ?? ''} onChange={(e) => update({ challengesOther: e.target.value })} />
          </div>
        )}
      </div>
    </>
  )
}

function QHours({ answers, update }: QProps) {
  const icons: IconName[] = ['clock', 'briefcase', 'target', 'flame']
  return (
    <>
      <QHead title="How much time can you realistically invest in learning per week?" sub="Be honest — your roadmap is paced to this." />
      <div className="option-list" role="radiogroup" aria-label="Weekly learning time">
        {WEEKLY_HOURS.map((o, i) => (
          <RadioOption key={o.id} icon={icons[i]} label={o.label} hint={o.hint} checked={answers.weeklyHours === o.id} onSelect={() => update({ weeklyHours: o.id })} />
        ))}
      </div>
    </>
  )
}

// ---------- Contact ----------

function ContactStep({ contact, setContact, signedIn, answers, onBack, onSubmitted, onAlreadyDone }: {
  contact: Contact
  setContact: React.Dispatch<React.SetStateAction<Contact>>
  signedIn: SignedIn
  answers: Answers
  onBack: () => void
  onSubmitted: () => void
  onAlreadyDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState<{ email: string } | null>(null)
  const [code, setCode] = useState('')
  const [info, setInfo] = useState('')

  const phoneDigits = contact.phone.replace(/[\s-]/g, '')
  const valid = contact.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(contact.email) && isValidPhone(contact.phoneCountry, phoneDigits) && contact.consent

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valid) {
      setError(!isValidPhone(contact.phoneCountry, phoneDigits) ? 'Please enter a valid phone number.' : 'Please fill in all details and accept to receive your report.')
      return
    }
    setBusy(true)
    setError('')
    let source: Record<string, string> = {}
    try {
      source = JSON.parse(window.sessionStorage.getItem(SOURCE_KEY) ?? '{}')
    } catch {
      // ignore
    }
    const res = await postJson('/api/assessment/submit', { answers, contact: { ...contact, phone: phoneDigits }, source })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    if (res.data.alreadyHasReport) return onAlreadyDone()
    if (res.data.needsOtp) {
      const email = String(res.data.email)
      setOtp({ email })
      await sendCode(email)
      return
    }
    onSubmitted()
  }

  async function sendCode(email: string) {
    setInfo('')
    const r = await postJson('/api/auth/request-otp', { email })
    if (!r.ok) setError(r.error)
    else setInfo(`This email already has an account. Enter the 6-digit code we sent to ${email} to continue.`)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!otp) return
    setBusy(true)
    setError('')
    const r = await postJson('/api/auth/verify-otp', { email: otp.email, code })
    if (!r.ok) {
      setBusy(false)
      return setError(r.error)
    }
    if (r.data.hasReport) return onAlreadyDone()
    setOtp(null)
    await submit()
  }

  if (otp) {
    return (
      <form className="stack" onSubmit={verify} noValidate>
        <div>
          <h1 className="q-title" tabIndex={-1} data-step-heading>Verify your email</h1>
          <p className="q-sub">{info || `We sent a 6-digit code to ${otp.email}.`}</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="field">
          <label className="label" htmlFor="contact-otp">6-digit code</label>
          <input id="contact-otp" className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length !== 6}>
          {busy ? <span className="spinner" /> : <>Verify & Generate Report <Icon name="arrowRight" size="1rem" /></>}
        </button>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="link-btn small" onClick={() => { setOtp(null); setCode(''); setError('') }}>Use a different email</button>
          <button type="button" className="link-btn small" onClick={() => sendCode(otp.email)}>Resend code</button>
        </div>
      </form>
    )
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="wizard-top">
        <div className="progress" aria-hidden="true"><i style={{ width: '100%' }} /></div>
        <span className="progress-count text-success" style={{ fontWeight: 600 }}>Complete!</span>
      </div>
      <div>
        <h1 className="q-title" tabIndex={-1} data-step-heading>Almost there! Where should we send your personalized report?</h1>
        <p className="q-sub">Your report will be sent to your email and saved to your personal dashboard.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="field">
        <label className="label" htmlFor="c-name">Full Name</label>
        <input id="c-name" className="input" autoComplete="name" maxLength={80} value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Rahul Sharma" />
      </div>
      <div className="field">
        <label className="label" htmlFor="c-email">Email Address</label>
        <input id="c-email" className="input" type="email" autoComplete="email" inputMode="email" maxLength={254} readOnly={Boolean(signedIn)}
          value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} placeholder="you@example.com" />
      </div>
      <div className="field">
        <label className="label" htmlFor="c-phone">Phone Number</label>
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
        <span>I agree to receive my personalized report and relevant learning resources via email and WhatsApp.</span>
      </label>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? <span className="spinner" /> : <>Generate My AI Career Report <Icon name="arrowRight" size="1.1rem" /></>}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onBack}><Icon name="arrowLeft" size="1rem" /> Back</button>
      <p className="secure-note"><Icon name="lock" size="0.9rem" /> Your information is secure with us</p>
    </form>
  )
}
