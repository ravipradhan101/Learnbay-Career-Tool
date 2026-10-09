'use client'

import { useState } from 'react'
import { Icon } from './Icon'
import { clearCachedChats, clearGuestChat } from '@/lib/client'

/** `confirm`: asked first (e.g. Bruce's goodbye with a Log out button); logging out only happens when it resolves true. */
export function LogoutButton({ className = 'btn btn-ghost', showIcon = false, before, confirm }: { className?: string; showIcon?: boolean; before?: () => Promise<void>; confirm?: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  async function logout() {
    if (confirm && !(await confirm().catch(() => true))) return
    setBusy(true)
    if (before) await before().catch(() => {})
    clearGuestChat()
    clearCachedChats()
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    } finally {
      window.location.href = '/'
    }
  }
  return (
    <button type="button" className={className} onClick={logout} disabled={busy}>
      {showIcon && <Icon name="logout" size="1.1rem" />}
      Log out
    </button>
  )
}
