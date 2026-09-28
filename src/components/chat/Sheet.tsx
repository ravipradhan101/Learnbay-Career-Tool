'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '../Icon'

/** A panel that slides over the chat (full report, profile, help). The chat stays underneath, where the learner left it. */
export function Sheet({ title, closeHref, children }: { title: string; closeHref: string; children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') router.push(closeHref, { scroll: false }) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeHref, router])
  return (
    <>
      <Link href={closeHref} scroll={false} className="ts-sheet-backdrop" aria-label="Close" tabIndex={-1} />
      <aside className="ts-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ts-sheet-head">
          <b>{title}</b>
          <Link href={closeHref} scroll={false} className="ts-menu-btn" aria-label="Back to chat"><Icon name="x" /></Link>
        </div>
        <div className="ts-sheet-body">{children}</div>
      </aside>
    </>
  )
}
