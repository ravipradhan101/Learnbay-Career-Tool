'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { openAssistant, trackEvent } from '@/lib/track'

/**
 * Mobile-only call button. The AI voice assistant plugs in through VOICE_ASSISTANT_URL or
 * VOICE_ASSISTANT_PHONE; until one is configured the option says so and offers chat instead.
 */
export function CallButton({ signedIn, voiceUrl, voicePhone }: { signedIn: boolean; voiceUrl?: string; voicePhone?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    trackEvent('call_sheet_open')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const voiceHref = voiceUrl || (voicePhone ? `tel:${voicePhone.replace(/[^\d+]/g, '')}` : '')

  return (
    <>
      <button type="button" className="fab fab-call no-print" aria-label="Call options" onClick={() => setOpen(true)}>
        <Icon name="phone" size="1.5rem" />
      </button>
      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Talk to us">
            <span className="sheet-handle" />
            <h2 style={{ fontSize: '1.125rem' }}>How would you like to talk?</h2>
            {voiceHref ? (
              <a className="sheet-option" href={voiceHref} target={voiceUrl ? '_blank' : undefined} rel="noopener noreferrer">
                <span className="fc-icon"><Icon name="mic" /></span>
                <span><b>Call our AI career assistant</b><span>Talk it through by voice, any time</span></span>
              </a>
            ) : (
              <div className="sheet-option" aria-disabled="true">
                <span className="fc-icon"><Icon name="mic" /></span>
                <span><b>AI voice assistant</b><span>Coming soon — chat with Career AI now instead</span></span>
              </div>
            )}
            <button type="button" className="sheet-option" onClick={() => { setOpen(false); openAssistant() }}>
              <span className="fc-icon"><Icon name="message" /></span>
              <span><b>Chat with Career AI</b><span>Instant answers about your career</span></span>
            </button>
            {signedIn && (
            <Link className="sheet-option" href="/dashboard/sessions" onClick={() => setOpen(false)}>
              <span className="fc-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name="calendar" /></span>
              <span><b>Book a 1:1 mentor session</b><span>Career counselling & mentor guidance at a time you pick</span></span>
            </Link>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
          </div>
        </>
      )}
    </>
  )
}
