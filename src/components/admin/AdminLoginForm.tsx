'use client'

import { useState } from 'react'
import { Icon } from '../Icon'
import { postJson } from '@/lib/client'

type Mode = 'login' | 'request' | 'reset'

/** Admin sign-in, plus “set or reset password” with a code emailed to the admin address. */
export function AdminLoginForm({ next = '/admin' }: { next?: string }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const go = (m: Mode) => { setMode(m); setError(''); setPassword(''); setConfirm('') }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'reset' && password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    const res = mode === 'login'
      ? await postJson('/api/admin/auth/login', { email: email.trim(), password })
      : mode === 'request'
        ? await postJson('/api/admin/auth/code', { email: email.trim() })
        : await postJson('/api/admin/auth/reset', { email: email.trim(), code, password })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    if (mode === 'request') { setInfo(String(res.data.message ?? 'Code sent.')); setMode('reset'); return }
    // The server only ever returns an /admin path; `next` was already validated on the server.
    window.location.href = next
  }

  const title = mode === 'login' ? 'Team sign-in' : 'Set or reset password'
  const sub = mode === 'login'
    ? 'Admin, BMs, ABMs and ISMs sign in here.'
    : mode === 'request'
      ? 'We’ll email a 6-digit code to your work address.'
      : info
  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <div>
        <h1>{title}</h1>
        <p className="muted small" style={{ marginTop: '0.375rem' }}>{sub}</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="field">
        <label className="label" htmlFor="ad-email">Work email</label>
        <input id="ad-email" className="input" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254}
          readOnly={mode === 'reset'} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@learnbay.co" />
      </div>
      {mode === 'reset' && (
        <div className="field">
          <label className="label" htmlFor="ad-code">6-digit code</label>
          <input id="ad-code" className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
      )}
      {mode !== 'request' && (
        <div className="field">
          <label className="label" htmlFor="ad-pass">{mode === 'reset' ? 'New password' : 'Password'}</label>
          <input id="ad-pass" className="input" type="password" autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} maxLength={200}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === 'reset' && <span className="help-note">At least 8 characters. A long passphrase is safest, because this area shows every lead’s contact details.</span>}
        </div>
      )}
      {mode === 'reset' && (
        <div className="field">
          <label className="label" htmlFor="ad-pass2">Confirm new password</label>
          <input id="ad-pass2" className="input" type="password" autoComplete="new-password" maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      )}
      <button className="btn btn-primary btn-block" disabled={busy || !email.trim() || (mode === 'login' && !password) || (mode === 'reset' && (code.length !== 6 || !password))}>
        {busy ? <span className="spinner" /> : mode === 'login' ? 'Sign in' : mode === 'request' ? 'Email me a code' : 'Save password & sign in'}
      </button>
      <div className="row between">
        {mode === 'login'
          ? <button type="button" className="link-btn small" onClick={() => go('request')}>Set or reset password</button>
          : <button type="button" className="link-btn small" onClick={() => go('login')}>Back to sign in</button>}
        {mode === 'reset' && <button type="button" className="link-btn small" onClick={() => go('request')}>Resend code</button>}
      </div>
      <p className="secure-note"><Icon name="lock" size="0.9rem" /> Admin access only. Repeated wrong passwords lock the account for 15 minutes.</p>
    </form>
  )
}
