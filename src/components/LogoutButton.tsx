'use client'

import { useState } from 'react'
import { Icon } from './Icon'
import { clearCachedChats, clearGuestChat } from '@/lib/client'

export function LogoutButton({ className = 'btn btn-ghost', showIcon = false }: { className?: string; showIcon?: boolean }) {
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
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
