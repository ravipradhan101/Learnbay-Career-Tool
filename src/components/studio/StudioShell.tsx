'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '../Icon'
import { Logo } from '../Logo'
import { LogoutButton } from '../LogoutButton'
import { CAREER_TOOLS, STUDIO_HOME } from './nav'
import { openWhyLearnbay } from '../why/WhyLearnbayButton'
import { initials } from '@/lib/questions'

function Nav({ toolStatus, onNavigate, eligibilityVisible }: { toolStatus: Record<string, string>; onNavigate?: () => void; eligibilityVisible: boolean }) {
  const pathname = usePathname()
  // The first tool not yet completed gets the orange "recommended" dot, as in the design.
  const nextTool = CAREER_TOOLS.find((t) => t.tool && toolStatus[t.tool] !== 'ready')?.tool
  return (
    <nav className="side-nav" aria-label="Career Studio">
      <Link href={STUDIO_HOME.href} aria-current={pathname === STUDIO_HOME.href ? 'page' : undefined} onClick={onNavigate}>
        <Icon name={STUDIO_HOME.icon} size="1.15rem" /> {STUDIO_HOME.label}
      </Link>
      <p className="side-label">CAREER TOOLS</p>
      {CAREER_TOOLS.filter((item) => eligibilityVisible || item.href !== '/dashboard/eligibility').map((item) => (
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={onNavigate}>
          <Icon name={item.icon} size="1.15rem" />
          {item.label}
          {item.tool && toolStatus[item.tool] === 'ready' && <Icon name="checkCircle" size="1rem" className="done" label="Completed" />}
          {item.tool && item.tool === nextTool && <span className="dot" aria-label="Recommended next" />}
        </Link>
      ))}
    </nav>
  )
}

function Foot({ name, email, onNavigate }: { name: string; email: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="side-foot">
      <nav className="side-nav" aria-label="Support">
        <button type="button" className="side-why" onClick={() => { onNavigate?.(); openWhyLearnbay('sidebar') }}>
          <Icon name="sparkles" size="1.15rem" /> Why Learnbay?
        </button>
        <Link href="/dashboard/help" aria-current={pathname === '/dashboard/help' ? 'page' : undefined} onClick={onNavigate}>
          <Icon name="lifebuoy" size="1.15rem" /> Help &amp; support
        </Link>
      </nav>
      <Link href="/dashboard/profile" className="profile-link" onClick={onNavigate}>
        <span className="avatar" aria-hidden="true">{initials(name)}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <b style={{ display: 'block', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b>
          <span className="xsmall muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={email}>My profile</span>
        </span>
        <Icon name="chevronRight" size="1rem" className="muted" />
      </Link>
      <LogoutButton className="btn btn-ghost btn-sm" showIcon />
    </div>
  )
}

export function StudioShell({ children, name, email, toolStatus, eligibilityVisible }: { children: React.ReactNode; name: string; email: string; toolStatus: Record<string, string>; eligibilityVisible: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="studio">
      <aside className="sidebar">
        <Logo href="/dashboard" />
        <Nav toolStatus={toolStatus} eligibilityVisible={eligibilityVisible} />
        <Foot name={name} email={email} />
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="topbar no-print">
          <button type="button" className="icon-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" size="1.5rem" /></button>
          <Logo href="/dashboard" />
          <Link href="/dashboard/sessions" className="icon-btn" aria-label="Book a mentor session" style={{ color: 'var(--accent)' }}><Icon name="calendar" /></Link>
        </div>
        <main className="studio-main">{children}</main>
      </div>
      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="row between"><Logo href="/dashboard" /><button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" /></button></div>
            <Nav toolStatus={toolStatus} onNavigate={() => setOpen(false)} eligibilityVisible={eligibilityVisible} />
            <Foot name={name} email={email} onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
