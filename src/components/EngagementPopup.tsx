'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { trackEvent } from '@/lib/track'

type Program = { name: string; url: string }

const KEY = 'lcn_exit_popup'

/**
 * Shown once per browser session when someone looks like they are leaving (cursor to the top of
 * the window on desktop, or a minute of inactivity on mobile). Never shown after a session request.
 */
export function EngagementPopup({ signedIn, hasSession, program }: { signedIn: boolean; hasSession: boolean; program: Program }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (hasSession) return
    try {
      if (window.sessionStorage.getItem(KEY)) return
    } catch {
      // ignore
    }
    const show = () => {
      try {
        if (window.sessionStorage.getItem(KEY)) return
        window.sessionStorage.setItem(KEY, '1')
      } catch {
        // ignore
      }
      setOpen(true)
      trackEvent('exit_popup_shown')
    }
    const armAt = Date.now() + 8000 // never on the first few seconds of a visit
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget && Date.now() > armAt) show()
    }
    const mobile = window.matchMedia('(max-width: 63.99em)').matches
    let timer = 0
    const resetIdle = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(show, 60_000)
    }
    document.addEventListener('mouseout', onLeave)
    if (mobile) {
      resetIdle()
      window.addEventListener('pointerdown', resetIdle)
      window.addEventListener('scroll', resetIdle, { passive: true })
    }
    return () => {
      document.removeEventListener('mouseout', onLeave)
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', resetIdle)
      window.removeEventListener('scroll', resetIdle)
    }
  }, [hasSession])

  if (!open) return null
  const close = () => setOpen(false)
  const act = (action: string) => () => {
    trackEvent('exit_popup_action', { action })
    close()
  }

  return (
    <div className="modal-backdrop no-print" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="exit-title">
        <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={close}><Icon name="x" /></button>
        <h2 id="exit-title">Before you go, have you seen these?</h2>
        <p className="muted small">A few things learners in your shoes usually find useful.</p>
        <a className="sheet-option" href={program.url} target="_blank" rel="noopener noreferrer" onClick={act('brochure')}>
          <span className="fc-icon"><Icon name="file" /></span>
          <span><b>Program details & brochure</b><span>{program.name}</span></span>
        </a>
        {signedIn ? (
          <Link className="sheet-option" href="/dashboard/masterclasses" onClick={act('material')}>
            <span className="fc-icon"><Icon name="book" /></span>
            <span><b>Free learning material</b><span>Tutorials and guides matched to your path</span></span>
          </Link>
        ) : (
          <Link className="sheet-option" href="/start?tool=skill-gap" onClick={act('skill_gap')}>
            <span className="fc-icon"><Icon name="chart" /></span>
            <span><b>Your free skill gap analysis</b><span>4 quick questions, about 2 minutes</span></span>
          </Link>
        )}
        {signedIn ? (
          <Link className="sheet-option" href="/dashboard/sessions" onClick={act('session')}>
            <span className="fc-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}><Icon name="calendar" /></span>
            <span><b>A free 1:1 mentor session</b><span>Career counselling & mentor guidance at a time you pick</span></span>
          </Link>
        ) : (
          <Link className="sheet-option" href="/start?tool=salary" onClick={act('salary')}>
            <span className="fc-icon"><Icon name="rupee" /></span>
            <span><b>What your next role pays</b><span>Free salary benchmark for your city</span></span>
          </Link>
        )}
        <button type="button" className="btn btn-ghost" onClick={close}>No thanks</button>
      </div>
    </div>
  )
}
