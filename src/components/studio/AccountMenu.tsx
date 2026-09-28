'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '../Icon'

const ITEMS = [
  { href: '/dashboard/profile', label: 'Profile', icon: 'user' },
  { href: '/dashboard/help', label: 'Help & Support', icon: 'lifebuoy' },
] as const

/** Avatar in the studio header. Opens a small account menu on click. */
export function AccountMenu({ initials, name }: { initials: string; name: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

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
      <button
        type="button"
        className="avatar avatar-btn"
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {initials}
      </button>
      {open && (
        <div className="menu-pop account-pop" role="menu">
          <p className="account-who">
            <b>{name}</b>
            <span className="small muted">Signed in</span>
          </p>
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" className="account-item" onClick={() => setOpen(false)}>
              <Icon name={i.icon} size="1.05rem" />
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
