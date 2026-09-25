'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { postJson } from '@/lib/client'

export function SwitchAccount({ next, first, masked }: { next: string; first: string; masked: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="auth-card">
      <span className="fc-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name="users" /></span>
      <div>
        <h1>This link was sent to someone else</h1>
        <p className="muted small" style={{ marginTop: '0.375rem' }}>
          You are signed in as <b>{first}</b> ({masked}), but the email link you opened belongs to a different account.
        </p>
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={async () => {
        setBusy(true)
        await postJson('/api/auth/logout', {})
        window.location.href = `/login?next=${encodeURIComponent(next)}`
      }}>
        {busy ? <span className="spinner" /> : 'Sign in with the email that got the link'}
      </button>
      <Link href={next} className="btn btn-outline btn-block">Continue as {first}</Link>
    </div>
  )
}
