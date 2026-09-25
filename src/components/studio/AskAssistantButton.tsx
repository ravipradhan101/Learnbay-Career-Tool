'use client'

import { openAssistant } from '@/lib/track'

export function AskAssistantButton({ label = 'Ask Career AI', question }: { label?: string; question?: string }) {
  return (
    <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => openAssistant(question)}>{label}</button>
  )
}
