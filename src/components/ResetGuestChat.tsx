'use client'

import { useEffect } from 'react'
import { clearGuestChat } from '@/lib/client'

/** A new journey starts here: an earlier conversation with Lumi in this tab is not brought back. */
export function ResetGuestChat() {
  useEffect(() => { clearGuestChat() }, [])
  return null
}
