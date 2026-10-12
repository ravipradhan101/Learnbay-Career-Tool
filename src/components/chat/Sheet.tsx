'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '../Icon'

/** Where the learner was when a sheet opened over the chat (set by StudioChat), so closing returns exactly there. */
export const SHEET_BACK_KEY = 'lcn_sheet_back'

/** A panel that slides over the chat (full report, profile, help). The chat stays underneath, where the learner left it. */
export function Sheet({ title, closeHref, children }: { title: string; closeHref: string; children: React.ReactNode }) {
  const router = useRouter()
  const close = useCallback((e?: React.MouseEvent) => {
    let back: string | null = null
    try { back = window.sessionStorage.getItem(SHEET_BACK_KEY) } catch { /* ignore */ }
    if (!back?.startsWith('/dashboard')) return // no stored place: the link's own href
    e?.preventDefault()
    router.push(back, { scroll: false })
  }, [router])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      let back: string | null = null
      try { back = window.sessionStorage.getItem(SHEET_BACK_KEY) } catch { /* ignore */ }
      router.push(back?.startsWith('/dashboard') ? back : closeHref, { scroll: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeHref, router])
  return (
    <>
      <Link href={closeHref} scroll={false} onClick={close} className="ts-sheet-backdrop" aria-label="Close" tabIndex={-1} />
      <aside className="ts-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ts-sheet-head">
          <b>{title}</b>
          <Link href={closeHref} scroll={false} onClick={close} className="ts-menu-btn" aria-label="Back to chat"><Icon name="x" /></Link>
        </div>
        <div className="ts-sheet-body">{children}</div>
      </aside>
    </>
  )
}
