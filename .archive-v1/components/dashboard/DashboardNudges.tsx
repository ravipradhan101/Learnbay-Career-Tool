'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '../Icon'

const SNOOZE_KEY = 'lcn_counsel_nudge_until'

/** "Your report is ready!" after generation and a gentle counselor nudge after some time on the dashboard. */
export function DashboardNudges({ hasCounsellorRequest }: { hasCounsellorRequest: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [counsel, setCounsel] = useState(false)

  useEffect(() => {
    if (params.get('welcome') === '1') setReady(true)
  }, [params])

  useEffect(() => {
    if (hasCounsellorRequest || pathname === '/dashboard/counselor') return
    let snoozedUntil = 0
    try {
      snoozedUntil = Number(window.localStorage.getItem(SNOOZE_KEY) ?? '0')
    } catch {
      // ignore
    }
    if (Date.now() < snoozedUntil) return
    const t = window.setTimeout(() => setCounsel(true), 75_000)
    return () => window.clearTimeout(t)
  }, [hasCounsellorRequest, pathname])

  function closeReady() {
    setReady(false)
    router.replace(pathname)
  }

  function snoozeCounsel() {
    setCounsel(false)
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 3 * 86_400_000))
    } catch {
      // ignore
    }
  }

  if (ready) {
    return (
      <div className="toast no-print" role="status">
        <span className="toast-icon success"><Icon name="checkCircle" size="1.5rem" /></span>
        <div style={{ flex: 1 }}>
          <h3>Your report is ready!</h3>
          <p>We&apos;ve sent your personalized AI career report to your email. It&apos;s also saved here any time you log in.</p>
          <div className="toast-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={closeReady}>View My Dashboard <Icon name="arrowRight" size="0.9rem" /></button>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={closeReady}><Icon name="x" size="1.1rem" /></button>
      </div>
    )
  }

  if (counsel) {
    return (
      <div className="toast no-print" role="dialog" aria-label="Talk to a career counselor">
        <span className="toast-icon fire"><Icon name="flame" size="1.5rem" /></span>
        <div style={{ flex: 1 }}>
          <h3>Want a faster way to achieve this?</h3>
          <p>Get personalized guidance from our career counselor and explore the right Learnbay program.</p>
          <div className="toast-actions">
            <Link href="/dashboard/counselor" className="btn btn-primary btn-sm" onClick={snoozeCounsel}>Talk to a Career Counselor</Link>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Dismiss" onClick={snoozeCounsel}><Icon name="x" size="1.1rem" /></button>
      </div>
    )
  }
  return null
}
