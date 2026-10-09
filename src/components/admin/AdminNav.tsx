'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/funnel', label: 'Funnel & drop-off' },
  { href: '/admin/navigation', label: 'Navigation' },
  { href: '/admin/features', label: 'Used vs avoided' },
  { href: '/admin/tokens', label: 'AI tokens & cost' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/eligibility', label: 'Eligibility test' },
  { href: '/admin/emails', label: 'Emails' },
  { href: '/admin/reviews', label: 'Reviews & suggestions' },
  { href: '/admin/topics', label: 'Topic requests' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/course-roles', label: 'Courses & roles' },
  { href: '/admin/companies', label: 'Companies' },
  { href: '/admin/crm', label: 'Pseudo Sales CRM ↗' },
]

/** Report tabs; the selected date range carries across tabs. */
export function AdminNav() {
  const pathname = usePathname()
  // On small screens the tabs scroll: keep the current one in view.
  useEffect(() => {
    document.querySelector<HTMLElement>('.admin-tabs a[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])
  const range = useSearchParams().get('range')
  return (
    <nav className="admin-tabs" aria-label="Reports">
      {TABS.map((t) => (
        <Link key={t.href} href={range ? `${t.href}?range=${encodeURIComponent(range)}` : t.href} aria-current={pathname === t.href || (t.href !== '/admin' && pathname.startsWith(`${t.href}/`)) ? 'page' : undefined}>{t.label}</Link>
      ))}
    </nav>
  )
}
