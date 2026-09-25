'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '../Icon'
import { Logo } from '../Logo'
import { LogoutButton } from '../LogoutButton'
import { DASH_NAV } from './nav'

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="side-nav" aria-label="Dashboard">
      {DASH_NAV.map((item) => (
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={onNavigate}>
          <Icon name={item.icon} size="1.15rem" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function CounselLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/dashboard/counselor" className="counsel-btn" onClick={onNavigate}>
      <span className="fc-icon"><Icon name="phone" size="1.1rem" /></span>
      Talk to a Counselor
    </Link>
  )
}

export function DashboardShell({ children, email }: { children: React.ReactNode; email: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="dash">
      <aside className="sidebar">
        <Logo href="/dashboard" />
        <NavLinks />
        <div className="side-foot">
          <CounselLink />
          <p className="xsmall muted" style={{ overflowWrap: 'anywhere' }}>{email}</p>
          <LogoutButton className="btn btn-ghost btn-sm" showIcon />
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <div className="topbar no-print">
          <Logo href="/dashboard" />
          <button type="button" className="icon-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon name="menu" size="1.5rem" />
          </button>
        </div>
        <main className="dash-main">{children}</main>
      </div>

      {pathname !== '/dashboard/counselor' && (
        <Link href="/dashboard/counselor" className="btn btn-primary btn-lg mobile-counsel no-print">
          <Icon name="phone" size="1.1rem" /> Talk to a Counselor
        </Link>
      )}

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Dashboard menu">
            <div className="drawer-head">
              <Logo href="/dashboard" />
              <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" /></button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="side-foot">
              <CounselLink onNavigate={() => setOpen(false)} />
              <p className="xsmall muted" style={{ overflowWrap: 'anywhere' }}>{email}</p>
              <LogoutButton className="btn btn-ghost btn-sm" showIcon />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
