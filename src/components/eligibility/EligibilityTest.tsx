'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { track } from '@/lib/analytics'
import { getJson, postJson } from '@/lib/client'
import { EDU_LEVELS, MATH_COMFORT } from '@/lib/questions'
import type { Attempts, TestState } from '@/lib/eligibility'
import { openWhyLearnbay } from '../why/WhyLearnbayButton'

type Rules = { questions: number; perQuestionSeconds: number; sessionSeconds: number; maxAttempts: number }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`

export function EligibilityTest({ initial, rules, trackLabel, needs, programName }: {
  initial: TestState
  rules: Rules
  trackLabel: string
  needs: { eduLevel: boolean; mathComfort: boolean }
  programName: string
}) {
  const [state, setState] = useState<TestState>(initial)
  const [edu, setEdu] = useState('')
  const [math, setMath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [askCall, setAskCall] = useState(false)

  async function start() {
    setAskCall(false)
    setBusy(true)
    setError('')
    const res = await postJson('/api/eligibility/start', { answers: { eduLevel: edu || undefined, mathComfort: math || undefined } })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    track('action', 'eligibility_started', { track: trackLabel, attempt: state.attempts.used + 1 })
    setState(res.data.state as TestState)
  }

  // Before a retake (attempt 2 and 3), suggest a counsellor call first. The learner can book or carry on.
  function retake() {
    track('step_view', 'eligibility:retake_prompt', { attempt: state.attempts.used + 1 })
    setAskCall(true)
  }

  if (busy) {
    return (
      <section className="card stack question-card" role="status" aria-live="polite">
        <h2 className="q-title">Preparing your questions…</h2>
        <p className="muted small">We are picking easy, short questions based on your profile. This takes a few seconds, and the timer starts only when the first question appears.</p>
        <div className="pulse-bar" aria-hidden="true"><i /></div>
      </section>
    )
  }
  if (state.status === 'in_progress') return <Runner state={state} onState={setState} />

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      {state.status === 'completed'
        ? <Result state={state} programName={programName} onRetake={retake} />
        : <Intro rules={rules} trackLabel={trackLabel} needs={needs} edu={edu} setEdu={setEdu} math={math} setMath={setMath} onStart={start} />}
      {askCall && <RetakePrompt attempts={state.attempts} onContinue={() => { track('action', 'eligibility_retake_continue'); start() }} onClose={() => setAskCall(false)} />}
    </>
  )
}

function Intro({ rules, trackLabel, needs, edu, setEdu, math, setMath, onStart }: {
  rules: Rules; trackLabel: string; needs: { eduLevel: boolean; mathComfort: boolean }
  edu: string; setEdu: (v: string) => void; math: string; setMath: (v: string) => void; onStart: () => void
}) {
  const ready = (!needs.eduLevel || edu) && (!needs.mathComfort || math)
  return (
    <div className="stack">
      <section className="card stack elig-intro">
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <span className="fc-icon"><Icon name="award" /></span>
          <div>
            <h2 className="card-title">{trackLabel} eligibility test</h2>
            <p className="card-sub">A quick, friendly check with easy questions picked for your profile: simple aptitude, common full forms and {trackLabel} basics. It helps your counsellor recommend the right track. It is not an entrance exam.</p>
          </div>
        </div>
        <div className="elig-rules">
          <div><b>{rules.questions}</b><span>short questions</span></div>
          <div><b>{rules.perQuestionSeconds}s</b><span>per question</span></div>
          <div><b>{Math.round(rules.sessionSeconds / 60)} min</b><span>for the whole test</span></div>
          <div><b>{rules.maxAttempts}</b><span>attempts available</span></div>
        </div>
        <ul className="list-check small">
          <li><Icon name="check" size="1rem" />One question at a time. Pick an answer and move on; you can&apos;t go back.</li>
          <li><Icon name="check" size="1rem" />If the timer runs out, the question is skipped automatically.</li>
          <li><Icon name="check" size="1rem" />Your score is emailed to you, and a counsellor will call to talk it through.</li>
        </ul>
      </section>

      {(needs.eduLevel || needs.mathComfort) && (
        <section className="card stack">
          <h2 className="card-title">Two quick questions first</h2>
          {needs.eduLevel && (
            <div className="stack" style={{ gap: '0.5rem' }}>
              <b className="small">Your highest qualification</b>
              <div className="chip-grid" role="radiogroup" aria-label="Highest qualification">
                {EDU_LEVELS.map((o) => <button key={o.id} type="button" role="radio" aria-checked={edu === o.id} className="chip" onClick={() => setEdu(o.id)}>{o.label}</button>)}
              </div>
            </div>
          )}
          {needs.mathComfort && (
            <div className="stack" style={{ gap: '0.5rem' }}>
              <b className="small">How comfortable are you with basic maths?</b>
              <div className="option-list" role="radiogroup" aria-label="Comfort with maths">
                {MATH_COMFORT.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={math === o.id} className="option" onClick={() => setMath(o.id)}>
                    <span className="option-mark" />{o.label}<span className="hint" style={{ marginLeft: 'auto' }}>{o.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      <button type="button" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} disabled={!ready} onClick={onStart}>
        Start the test
      </button>
    </div>
  )
}

function Runner({ state, onState }: { state: Extract<TestState, { status: 'in_progress' }>; onState: (s: TestState) => void }) {
  const [choice, setChoice] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const offset = useRef(state.serverNow - Date.now())
  const [now, setNow] = useState(() => Date.now() + offset.current)
  const sent = useRef(-1)

  useEffect(() => { offset.current = state.serverNow - Date.now(); setChoice(null) }, [state.index, state.serverNow])
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + offset.current), 200)
    return () => window.clearInterval(t)
  }, [])

  const submit = useCallback(async (value: number | null) => {
    if (sent.current === state.index) return
    sent.current = state.index
    setBusy(true)
    const res = await postJson('/api/eligibility/answer', { index: state.index, choice: value })
    setBusy(false)
    if (!res.ok) {
      sent.current = -1
      const again = await getJson('/api/eligibility')
      if (again.ok) onState(again.data.state as TestState)
      return
    }
    const next = res.data.state as TestState
    if (next.status === 'completed') track('action', 'eligibility_completed', { score: next.score, attempt: next.attempt })
    onState(next)
  }, [state.index, onState])

  const qLeft = Math.max(0, Math.ceil((state.questionEndsAt - now) / 1000))
  const sLeft = Math.max(0, Math.ceil((state.sessionEndsAt - now) / 1000))
  useEffect(() => { if (qLeft === 0 && !busy) submit(choice) }, [qLeft, busy, choice, submit])

  const pct = Math.min(100, (qLeft / Math.max(1, state.question.seconds)) * 100)
  return (
    <section className="card stack question-card elig-runner" aria-live="polite">
      <div className="row between">
        <span className="pill primary">Question {state.index + 1} of {state.total}{state.attempt > 1 ? ` · attempt ${state.attempt}` : ''}</span>
        <span className={`pill ${sLeft < 45 ? 'danger' : ''}`}><Icon name="clock" size="0.9rem" /> {fmt(sLeft)} left</span>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${(state.index / state.total) * 100}%` }} /></div>
      <div className="elig-timer" role="timer" aria-label={`${qLeft} seconds left for this question`}>
        <div className={`elig-timer-bar${qLeft <= 5 ? ' warn' : ''}`}><i style={{ width: `${pct}%` }} /></div>
        <b className={qLeft <= 5 ? 'text-danger' : undefined}>{qLeft}s</b>
      </div>
      <span className="eyebrow">{state.question.topic}</span>
      <h2 className="q-title">{state.question.text}</h2>
      <div className="option-grid" role="radiogroup" aria-label="Answer options">
        {state.question.options.map((o, i) => (
          <button key={`${state.index}-${i}`} type="button" role="radio" aria-checked={choice === i} className="option" disabled={busy} onClick={() => setChoice(i)}>
            <span className="option-key">{'ABCD'[i]}</span>{o}
          </button>
        ))}
      </div>
      <div className="row between">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => submit(null)}>Skip</button>
        <button type="button" className="btn btn-primary" disabled={busy || choice === null} onClick={() => submit(choice)}>
          {busy ? <span className="spinner" /> : state.index + 1 === state.total ? 'Finish test' : <>Next <Icon name="arrowRight" size="1rem" /></>}
        </button>
      </div>
    </section>
  )
}

function Result({ state, programName, onRetake }: { state: Extract<TestState, { status: 'completed' }>; programName: string; onRetake: () => void }) {
  const b = state.breakdown
  const a = state.attempts
  return (
    <div className="stack">
      <section className="card stack elig-result">
        <div className="row between">
          <span className="pill success"><Icon name="checkCircle" size="0.9rem" /> Eligibility test completed</span>
          <span className="small muted">Attempt {state.attempt} of {a.max}</span>
        </div>
        <div className="score-row">
          <div className="score-ring" style={{ ['--v' as string]: state.score }}><div><b>{state.score}</b><small>/100</small></div></div>
          <div className="stack" style={{ gap: '0.375rem', flex: 1, minWidth: '14rem' }}>
            <h2 className="card-title">{state.band.title}</h2>
            <p>{state.band.text}</p>
            <p className="small muted">{state.correct} of {state.total} correct · {state.trackLabel} · took {fmt(b.seconds)} · about {b.avgSeconds}s per question</p>
          </div>
        </div>
        <div className="coverage">
          {b.byTopic.map((t) => (
            <div className="coverage-row" key={t.topic}><span>{t.topic}</span><b>{t.correct}/{t.total}</b><div className="coverage-bar"><i style={{ width: `${t.total ? (t.correct / t.total) * 100 : 0}%` }} /></div></div>
          ))}
        </div>
        {b.unanswered > 0 && <p className="xsmall muted">{b.unanswered} question{b.unanswered === 1 ? ' was' : 's were'} skipped or ran out of time.</p>}
        {a.history.length > 1 && (
          <div className="attempt-history">
            {a.history.map((h) => <span key={h.attempt} className={`pill ${h.score === a.best ? 'success' : ''}`}>Attempt {h.attempt}: {h.score}/100</span>)}
          </div>
        )}
      </section>

      <section className="card stack elig-next">
        <h2 className="card-title"><Icon name="phone" className="text-primary" /> What happens next</h2>
        <ol className="list-num">
          <li>We have emailed your result to you.</li>
          <li>A Learnbay counsellor will call you to talk through your score, the right track and the {programName}.</li>
          <li>Prefer a specific time? Pick a slot and we will call you then.</li>
        </ol>
        <div className="row">
          <Link href="/dashboard/sessions" className="btn btn-primary">Choose a time for the call</Link>
          <button type="button" className="btn btn-outline" onClick={() => openWhyLearnbay('eligibility')}>How Learnbay is different</button>
          {a.left > 0
            ? <button type="button" className="btn btn-ghost" onClick={onRetake}><Icon name="refresh" size="1rem" /> Retake ({a.left} attempt{a.left === 1 ? '' : 's'} left)</button>
            : <span className="small muted">{a.available ? `All ${a.max} attempts used.` : 'Retakes are not available right now.'} Your best score ({a.best}/100) is shared with your counsellor.</span>}
        </div>
      </section>
    </div>
  )
}

function RetakePrompt({ attempts, onContinue, onClose }: { attempts: Attempts; onContinue: () => void; onClose: () => void }) {
  const next = attempts.used + 1
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="retake-title">
        <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        <span className="fc-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name="phone" /></span>
        <h2 id="retake-title" className="card-title">Before attempt {next} of {attempts.max}: a quick call?</h2>
        <p className="small">
          A 15-minute call with a Learnbay counsellor usually helps more than a retake: they will go through the questions you found tricky and tell you what to brush up on{attempts.best !== null ? `, starting from your best score of ${attempts.best}/100` : ''}.
        </p>
        {attempts.callBooked && <p className="small text-success"><Icon name="checkCircle" size="0.9rem" /> You already have a call requested. You can still book another time.</p>}
        <div className="stack" style={{ gap: '0.5rem' }}>
          <Link href="/dashboard/sessions" className="btn btn-primary btn-block" onClick={() => track('action', 'eligibility_retake_book_call')}>Book a call first</Link>
          <button type="button" className="btn btn-outline btn-block" onClick={onContinue}>No thanks, continue to attempt {next}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
