'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'

/** Email login with a 6-digit code. `compact` is the landing-page card version. */
export function LoginForm({ next = '', compact = false }: { next?: string; compact?: boolean }) {
  const [step, setStep] = useState<'id' | 'code'>('id')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const res = await postJson('/api/auth/request-otp', { email: email.trim() })
    setBusy(false)
    if (!res.ok) { track('error', 'login:request_code', { status: res.status }); return setError(res.error) }
    track('step_view', 'login:code', { resend: step === 'code' || undefined })
    setInfo(String(res.data.message ?? 'Code sent.'))
    setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await postJson('/api/auth/verify-otp', { email: email.trim(), code })
    if (!res.ok) { setBusy(false); track('error', 'login:verify', { status: res.status }); return setError(res.error) }
    track('action', 'login_completed', { onboarded: Boolean(res.data.onboarded) })
    window.location.href = next || String(res.data.redirect ?? '/dashboard')
  }

  const Heading = compact ? 'h2' : 'h1'
  return (
    <div className={compact ? 'login-card' : 'auth-card'}>
      <div>
        <Heading className={compact ? 'login-title' : undefined}>{step === 'id' ? 'Welcome back' : 'Enter your code'}</Heading>
        <p className="muted small" style={{ marginTop: '0.375rem' }}>
          {step === 'id' ? 'Log in with your email. We’ll send you a 6-digit code — no password needed.' : info}
        </p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {step === 'id' ? (
        <form className="stack" onSubmit={requestCode} noValidate style={{ gap: '0.75rem' }}>
          <label className="sr-only" htmlFor={compact ? 'lp-id' : 'login-id'}>Email address</label>
          <input id={compact ? 'lp-id' : 'login-id'} className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="btn btn-primary btn-block" disabled={busy || !/\S+@\S+\.\S+/.test(email.trim())}>
            {busy ? <span className="spinner" /> : <>Send code <Icon name="arrowRight" size="1rem" /></>}
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={verify} noValidate style={{ gap: '0.75rem' }}>
          <label className="sr-only" htmlFor={compact ? 'lp-code' : 'login-code'}>6-digit code</label>
          <input id={compact ? 'lp-code' : 'login-code'} className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
          <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
            {busy ? <span className="spinner" /> : <>Log in <Icon name="arrowRight" size="1rem" /></>}
          </button>
          <div className="row between">
            <button type="button" className="link-btn small" onClick={() => { setStep('id'); setCode(''); setError('') }}>Change</button>
            <button type="button" className="link-btn small" onClick={() => requestCode()} disabled={busy}>Resend code</button>
          </div>
        </form>
      )}
      {!compact && <p className="small muted" style={{ textAlign: 'center' }}>New here? <Link href="/start">Start your free analysis</Link></p>}
      <p className="secure-note"><Icon name="lock" size="0.9rem" /> Your information is secure with us</p>
    </div>
  )
}
