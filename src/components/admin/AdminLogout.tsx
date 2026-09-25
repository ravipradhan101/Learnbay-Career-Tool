'use client'

import { useState } from 'react'
import { postJson } from '@/lib/client'

export function AdminLogout() {
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
      setBusy(true)
      await postJson('/api/admin/auth/logout', {})
      window.location.href = '/admin/login'
    }}>Log out</button>
  )
}
