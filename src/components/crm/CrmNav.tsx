'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getJson } from '@/lib/client'

const TABS = [
  { href: '/admin/crm', label: 'Today' },
  { href: '/admin/crm/leads', label: 'Leads' },
  { href: '/admin/crm/tasks', label: 'Calls & reminders' },
  { href: '/admin/crm/team', label: 'Team' },
  { href: '/admin/crm/analytics', label: 'Analytics' },
]

/** CRM tabs, plus a reminder bell that checks every minute and alerts (title + optional notification) when a call is due. */
export function CrmNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const [due, setDue] = useState<{ due: number; overdue: number }>({ due: 0, overdue: 0 })

  useEffect(() => {
    let alive = true
    let last = 0
    const base = document.title.replace(/^\(\d+\) /, '')
    async function check() {
      const r = await getJson('/api/crm/reminders')
      if (!alive || !r.ok) return
      const next = { due: Number(r.data.due ?? 0), overdue: Number(r.data.overdue ?? 0) }
      setDue(next)
      document.title = next.due ? `(${next.due}) ${base}` : base
      if (next.due > last && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Learnbay CRM', { body: `${next.due} call${next.due === 1 ? '' : 's'} or reminder${next.due === 1 ? '' : 's'} due now` })
      }
      last = next.due
    }
    void check()
    const t = setInterval(check, 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const tabs = isAdmin ? [...TABS, { href: '/admin', label: 'Admin reports ↗' }] : TABS
  return (
    <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
      <nav className="admin-tabs" aria-label="Sales CRM">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={(t.href === '/admin/crm' ? pathname === t.href : pathname.startsWith(t.href) && t.href !== '/admin') ? 'page' : undefined}>{t.label}</Link>
        ))}
      </nav>
      <Link href="/admin/crm/tasks" className={`crm-bell${due.overdue ? ' late' : due.due ? ' due' : ''}`} title="My calls and reminders due now"
        onClick={() => { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission() }}>
        <span aria-hidden="true">🔔</span>
        <span>{due.due ? `${due.due} due` : 'All clear'}</span>
      </Link>
    </div>
  )
}
