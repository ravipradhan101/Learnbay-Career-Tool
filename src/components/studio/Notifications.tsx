'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'

export type Note = { href: string; text: string }

export function Notifications({ notes }: { notes: Note[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />
        {notes.length > 0 && <span className="badge-dot" />}
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {notes.length ? notes.map((n) => (
            <Link key={n.text} href={n.href} role="menuitem" onClick={() => setOpen(false)}>{n.text}</Link>
          )) : <p className="muted">You are all caught up.</p>}
        </div>
      )}
    </div>
  )
}
