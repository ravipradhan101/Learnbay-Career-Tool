'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from './Icon'
import { Robot } from './Robot'
import { getJson, postJson } from '@/lib/client'

const ANALYZE_STEPS = [
  'Understanding your background',
  'Analyzing skills and experience',
  'Mapping career opportunities',
  'Generating skill gap analysis',
  'Creating personalized roadmap',
  'Matching with Learnbay programs',
]

const BUILD_ITEMS: { icon: IconName; text: string }[] = [
  { icon: 'target', text: 'Career opportunities & role fit' },
  { icon: 'route', text: 'Skill gaps and learning roadmap' },
  { icon: 'folder', text: 'Domain-specific project ideas' },
  { icon: 'award', text: 'Relevant Learnbay program recommendation' },
  { icon: 'rupee', text: 'Salary insights (market benchmark)' },
]

type Phase = 'analyzing' | 'building' | 'error' | 'exhausted'

/**
 * Triggers report generation and shows the "Analyzing" then "Creating your roadmap" screens
 * until the report is ready. Safe to mount again after a refresh: the server only generates once.
 */
export function GeneratingView({ name, onReady }: { name: string; onReady: () => void }) {
  const [phase, setPhase] = useState<Phase>('analyzing')
  const [done, setDone] = useState(0)
  const [error, setError] = useState('')
  const started = useRef(false)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    if (phase !== 'analyzing') return
    const t = window.setInterval(() => {
      setDone((d) => {
        if (d + 1 >= ANALYZE_STEPS.length) {
          window.clearInterval(t)
          setPhase((p) => (p === 'analyzing' ? 'building' : p))
        }
        return Math.min(d + 1, ANALYZE_STEPS.length)
      })
    }, 2200)
    return () => window.clearInterval(t)
  }, [phase])

  async function run(): Promise<void> {
    setError('')
    const res = await postJson('/api/report/generate', {})
    if (res.ok && res.data.status === 'ready') return readyRef.current()
    if (res.ok && res.data.status === 'generating') return poll()
    if (res.ok) return poll()
    if (res.data.redirect) {
      window.location.href = String(res.data.redirect)
      return
    }
    if (res.data.exhausted) {
      setPhase('exhausted')
      setError(res.error)
      return
    }
    setPhase('error')
    setError(res.error)
  }

  async function poll(): Promise<void> {
    const deadline = Date.now() + 4 * 60_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000))
      const res = await getJson('/api/report/status')
      if (res.ok && res.data.status === 'ready') return readyRef.current()
      if (res.ok && res.data.status === 'failed') break
    }
    // The other request failed or timed out; try generating again ourselves.
    return run()
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'error' || phase === 'exhausted') {
    return (
      <div className="stack" style={{ textAlign: 'center', alignItems: 'center' }}>
        <span className="modal-icon"><Icon name="alert" size="1.5rem" /></span>
        <h1 className="q-title" tabIndex={-1} data-step-heading>We hit a snag building your report</h1>
        <p className="muted">{error}</p>
        {phase === 'error' ? (
          <button type="button" className="btn btn-primary" onClick={() => { setPhase('building'); run() }}>
            <Icon name="refresh" size="1rem" /> Try again
          </button>
        ) : (
          <Link className="btn btn-primary" href="/dashboard/counselor">Talk to a Counselor</Link>
        )}
      </div>
    )
  }

  if (phase === 'analyzing') {
    return (
      <>
        <div className="wizard-top" aria-hidden="true">
          <div className="progress"><i style={{ width: `${Math.max(8, (done / ANALYZE_STEPS.length) * 100)}%` }} /></div>
        </div>
        <div className="analyzing">
          <div className="stack">
            <h1 className="q-title" tabIndex={-1} data-step-heading>Analyzing your profile...</h1>
            <p className="muted">Our AI is analyzing your inputs, comparing with market data and creating your personalized insights. This will take less than a minute.</p>
            <ul className="analyze-list" aria-live="polite">
              {ANALYZE_STEPS.map((s, i) => (
                <li key={s} className={i < done ? 'done' : i === done ? 'active' : ''}>
                  <span className="dot">{i < done && <Icon name="check" size="0.8rem" />}</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <Robot className="welcome-robot" />
        </div>
        <p className="quote">“Almost there! Good things take a few seconds to create something meaningful.”</p>
      </>
    )
  }

  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <h2 tabIndex={-1} data-step-heading>Creating your personalized roadmap</h2>
      <p>We&apos;re putting together your career insights, learning plan, project recommendations and more{name ? `, ${name}` : ''}.</p>
      <div className="pulse-bar" aria-hidden="true"><i /></div>
      <ul>
        {BUILD_ITEMS.map((i) => (
          <li key={i.text}><span className="lp-icon"><Icon name={i.icon} size="1rem" /></span>{i.text}</li>
        ))}
      </ul>
      <div className="did-you-know">
        <Icon name="bulb" size="1.5rem" className="text-primary" />
        <div>
          <b>Did you know?</b>
          <span>Professionals with structured, project-based learning are 2-3x more likely to transition into AI roles.</span>
          <p className="xsmall muted" style={{ marginTop: '0.25rem' }}>*Based on industry reports and internal learner data</p>
        </div>
      </div>
    </div>
  )
}
