'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '../Icon'
import { track } from '@/lib/analytics'
import { getJson, postJson } from '@/lib/client'
import {
  CITIES, CTC_BANDS, SKILLS, SKILL_NONE, TARGET_NOT_SURE, TIMELINES, WEEKLY_HOURS, type Answers, type Option, type ToolQuestionKey,
} from '@/lib/questions'
import { QUESTION_TITLES, type ToolMeta } from '@/lib/tools-meta'

type Props = {
  tool: Pick<ToolMeta, 'id' | 'name' | 'generating' | 'preview'>
  missing: ToolQuestionKey[]
  targetOptions: Option[]
  status: 'none' | 'pending' | 'generating' | 'ready' | 'failed'
}

/** Asks only the questions this tool still needs, then generates the result. */
export function ToolRunner({ tool, missing, targetOptions, status }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<Answers>({})
  // First visit to a tool: show what it produces before asking anything. Resumed generations skip straight to progress.
  const [phase, setPhase] = useState<'intro' | 'questions' | 'generating' | 'error' | 'exhausted'>(status === 'generating' ? 'generating' : 'intro')
  const [error, setError] = useState('')
  const [done, setDone] = useState(0)
  const started = useRef(false)

  const key = missing[index]
  const genStarted = useRef(0)

  useEffect(() => {
    if (phase === 'questions' && key) track('step_view', `${tool.id}:${key}`, { step: index + 1, of: missing.length })
  }, [phase, key, index, missing.length, tool.id])

  function ready() {
    track('action', 'tool_ready', { tool: tool.id, wait_ms: genStarted.current ? Date.now() - genStarted.current : undefined })
    router.refresh()
  }

  async function generate(): Promise<void> {
    setPhase('generating')
    setError('')
    if (!genStarted.current) { genStarted.current = Date.now(); track('action', 'tool_generate_start', { tool: tool.id }) }
    const res = await postJson(`/api/tools/${tool.id}/generate`, {})
    if (res.ok && res.data.status === 'ready') return ready()
    if (res.ok && res.data.status === 'generating') return poll()
    track('error', 'tool_generate_failed', { tool: tool.id, status: res.ok ? 200 : res.status, exhausted: !res.ok && Boolean(res.data.exhausted) })
    if (!res.ok && res.data.exhausted) { setPhase('exhausted'); setError(res.error); return }
    setPhase('error')
    setError(res.ok ? 'Something went wrong.' : res.error)
  }

  async function poll(): Promise<void> {
    const until = Date.now() + 4 * 60_000
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, 3000))
      const res = await getJson(`/api/tools/${tool.id}/status`)
      if (res.ok && res.data.status === 'ready') return ready()
      if (res.ok && res.data.status === 'failed') break
    }
    return generate()
  }

  // A generation already running (e.g. after a refresh): keep polling it.
  useEffect(() => {
    if (status === 'generating' && !started.current) {
      started.current = true
      poll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase === 'intro') track('step_view', `${tool.id}:intro`)
  }, [phase, tool.id])

  function begin() {
    track('action', 'tool_intro_start', { tool: tool.id })
    if (missing.length) setPhase('questions')
    else { started.current = true; generate() }
  }

  useEffect(() => {
    if (phase !== 'generating') return
    const t = window.setInterval(() => setDone((d) => Math.min(d + 1, tool.generating.length)), 2600)
    return () => window.clearInterval(t)
  }, [phase, tool.generating.length])

  async function next(patch: Partial<Answers>) {
    const merged = { ...draft, ...patch }
    const [k, v] = Object.entries(patch)[0] ?? []
    if (k) track('step_answer', `${tool.id}:${k}`, { value: Array.isArray(v) ? v.join(',') : String(v) })
    setDraft(merged)
    if (index + 1 < missing.length) {
      setIndex(index + 1)
      return
    }
    setPhase('generating')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: merged }),
      credentials: 'same-origin',
    }).then((r) => r.json().catch(() => ({}))).catch(() => ({ ok: false, error: 'Network error. Please try again.' }))
    if (!res.ok) { setPhase('error'); setError(res.error ?? 'Could not save your answers.'); return }
    generate()
  }

  if (phase === 'intro') {
    const p = tool.preview
    return (
      <section className="card stack tool-intro">
        <div className="tool-intro-grid">
          <div className="stack" style={{ gap: '0.875rem' }}>
            <span className="eyebrow">What you will get</span>
            <h2 className="q-title">{p.promise}</h2>
            <ul className="intro-gets">
              {p.gets.map((g) => (
                <li key={g.title}><span className="fc-icon"><Icon name={g.icon} /></span><span><b>{g.title}</b><span>{g.text}</span></span></li>
              ))}
            </ul>
          </div>
          <ToolPreviewVisual id={tool.id} />
        </div>
        <div className="row between tool-intro-foot">
          <span className="small muted"><Icon name="clock" size="0.9rem" /> {missing.length ? `${missing.length} quick question${missing.length === 1 ? '' : 's'}, then` : 'No questions needed,'} about 30 seconds to build · saved to your studio</span>
          <button type="button" className="btn btn-primary btn-lg" onClick={begin}>{missing.length ? "Let's start" : `Build my ${tool.name}`} <Icon name="arrowRight" size="1rem" /></button>
        </div>
      </section>
    )
  }

  if (phase === 'error' || phase === 'exhausted') {
    return (
      <section className="card stack question-card" style={{ alignItems: 'flex-start' }}>
        <span className="fc-icon" style={{ background: 'var(--warning-50)', color: 'var(--warning)' }}><Icon name="alert" /></span>
        <h2 className="q-title">We hit a snag</h2>
        <p className="muted">{error}</p>
        {phase === 'error'
          ? <button type="button" className="btn btn-primary" onClick={() => generate()}><Icon name="refresh" size="1rem" /> Try again</button>
          : <Link href="/dashboard/sessions" className="btn btn-primary">Book a mentor session</Link>}
      </section>
    )
  }

  if (phase === 'generating') {
    return (
      <section className="card stack question-card" role="status" aria-live="polite">
        <h2 className="q-title">Building your {tool.name}…</h2>
        <p className="muted small">This usually takes 20–40 seconds.</p>
        <div className="pulse-bar" aria-hidden="true"><i /></div>
        <ul className="gen-list">
          {tool.generating.map((s, i) => (
            <li key={s} className={i < done ? 'done' : i === done ? 'active' : ''}>
              <span className="dot">{i < done && <Icon name="check" size="0.8rem" />}</span>{s}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const q = QUESTION_TITLES[key]
  return (
    <section className="card stack question-card">
      <div className="steps-top">
        {index > 0 && <button type="button" className="icon-btn" aria-label="Back" style={{ width: '2rem', height: '2rem' }} onClick={() => { track('step_back', `${tool.id}:${key}`); setIndex(index - 1) }}><Icon name="arrowLeft" size="1.1rem" /></button>}
        <div className="progress" aria-hidden="true"><i style={{ width: `${((index + 1) / missing.length) * 100}%` }} /></div>
        <span className="progress-count">{index + 1}/{missing.length}</span>
      </div>
      <div>
        <h2 className="q-title">{q.title}</h2>
        <p className="q-sub">{q.sub}</p>
      </div>
      <Question k={key} value={draft} targetOptions={targetOptions} onAnswer={next} />
    </section>
  )
}

function Question({ k, value, targetOptions, onAnswer }: { k: ToolQuestionKey; value: Answers; targetOptions: Option[]; onAnswer: (p: Partial<Answers>) => void }) {
  const [skills, setSkills] = useState<string[]>(value.skills ?? [])
  if (k === 'skills') {
    const toggle = (id: string) => {
      if (id === SKILL_NONE) return setSkills((s) => (s.includes(SKILL_NONE) ? [] : [SKILL_NONE]))
      setSkills((s) => { const w = s.filter((x) => x !== SKILL_NONE); return w.includes(id) ? w.filter((x) => x !== id) : [...w, id] })
    }
    return (
      <>
        <div className="chip-grid">
          {SKILLS.map((o) => <button key={o.id} type="button" className="chip" aria-pressed={skills.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</button>)}
          <button type="button" className="chip" aria-pressed={skills.includes(SKILL_NONE)} onClick={() => toggle(SKILL_NONE)}>None yet</button>
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={!skills.length} onClick={() => onAnswer({ skills })}>Continue <Icon name="arrowRight" size="1rem" /></button>
      </>
    )
  }
  const options: Option[] =
    k === 'targetRole' ? [...targetOptions, { id: TARGET_NOT_SURE, label: 'Not sure — suggest one for me' }]
      : k === 'ctc' ? CTC_BANDS
        : k === 'city' ? CITIES
          : k === 'weeklyHours' ? WEEKLY_HOURS
            : TIMELINES
  const grid = k === 'ctc' || k === 'city'
  return (
    <div className={grid ? 'chip-grid' : 'option-list'} role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value[k] === o.id} className={grid ? 'chip' : 'option'} onClick={() => onAnswer({ [k]: o.id })}>
          {grid ? o.label : <><span className="option-mark" />{o.label}{o.hint && <span className="hint" style={{ marginLeft: 'auto' }}>{o.hint}</span>}</>}
        </button>
      ))}
    </div>
  )
}

/** An illustrative miniature of the finished report (sample shapes, not the learner's data). */
function ToolPreviewVisual({ id }: { id: string }) {
  if (id === 'salary') {
    return (
      <div className="preview-card" aria-hidden="true">
        <span className="preview-label">Sample preview</span>
        <b className="preview-big">+35–60%</b>
        <span className="small muted">Potential growth</span>
        {[[18, 42], [30, 62], [38, 78], [44, 90]].map(([a, b], i) => (
          <div key={i} className="preview-range"><span style={{ width: `${20 + i * 12}%` }} /><div><i style={{ left: `${a}%`, width: `${b - a}%` }} className={i === 0 ? 'cur' : undefined} /></div></div>
        ))}
      </div>
    )
  }
  if (id === 'roadmap') {
    return (
      <div className="preview-card" aria-hidden="true">
        <span className="preview-label">Sample preview</span>
        {['Foundations', 'Core skills', 'Projects', 'Job-ready'].map((t, i) => (
          <div key={t} className="preview-phase"><span>{i + 1}</span><div><b>{t}</b><i style={{ width: `${55 + i * 10}%` }} /><i style={{ width: `${40 + i * 8}%` }} /></div></div>
        ))}
      </div>
    )
  }
  return (
    <div className="preview-card" aria-hidden="true">
      <span className="preview-label">Sample preview</span>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <div className="score-ring small-ring" style={{ ['--v' as string]: 58 }}><div><b>58</b></div></div>
        <div className="stack" style={{ gap: '0.25rem' }}><b>Builder</b><span className="small muted">Readiness for your target role</span></div>
      </div>
      {[[70, 80], [45, 85], [30, 75], [55, 70], [20, 65]].map(([cur, req], i) => (
        <div key={i} className="preview-skill"><span style={{ width: `${25 + (i % 3) * 10}%` }} /><div className="skill-bar"><span className="cur" style={{ width: `${cur}%` }} /><span className="req" style={{ left: `${req}%` }} /></div></div>
      ))}
    </div>
  )
}
