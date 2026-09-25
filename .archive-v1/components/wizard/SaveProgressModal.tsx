'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { postJson } from '@/lib/client'
import type { Answers } from '@/lib/questions'

export function SaveProgressModal({ percent, answers, step, defaultEmail, onClose, onSaved }: {
  percent: number
  answers: Answers
  step: number
  defaultEmail: string
  onClose: () => void
  onSaved: (email: string) => void
}) {
  const [email, setEmail] = useState(defaultEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await postJson('/api/assessment/save-progress', { email, answers, step })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onSaved(email.trim())
    setDone(true)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="save-title">
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        <span className="modal-icon"><Icon name="clock" size="1.5rem" /></span>
        {done ? (
          <>
            <h2 id="save-title" style={{ fontSize: '1.25rem' }}>Progress saved</h2>
            <p className="muted small">We emailed you a link to continue any time in the next 7 days.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={onClose}>Continue now</button>
          </>
        ) : (
          <form className="stack" onSubmit={save} noValidate>
            <h2 id="save-title" style={{ fontSize: '1.25rem' }}>Don&apos;t lose your progress!</h2>
            <p className="muted small">Your personalized report is {percent}% ready. Enter your email to receive it and continue later.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <label className="sr-only" htmlFor="save-email">Email address</label>
            <input ref={inputRef} id="save-email" className="input" type="email" inputMode="email" autoComplete="email" placeholder="your@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary btn-block" disabled={busy || !email.includes('@')}>
              {busy ? <span className="spinner" /> : 'Save & Continue'}
            </button>
            <button type="button" className="link-btn small" onClick={onClose} style={{ color: 'var(--muted)' }}>No thanks</button>
          </form>
        )}
      </div>
    </div>
  )
}
