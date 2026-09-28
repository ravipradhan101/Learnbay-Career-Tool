import Link from 'next/link'
import { Icon } from '../Icon'
import { AccountMenu } from './AccountMenu'
import { Notifications, type Note } from './Notifications'
import { getStudio } from '@/lib/data'
import { initials } from '@/lib/questions'
import { TOOLS } from '@/lib/tools-meta'
import { sessionTypeLabel } from '@/lib/sessions'

/** Page title row used on every studio page: title, bell, mentor booking and avatar. */
export async function StudioHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, tools, latestSession: session } = await getStudio()
  const notes: Note[] = []
  for (const t of TOOLS) {
    const row = tools.find((r) => r.tool === t.id)
    if (row?.status === 'ready') notes.push({ href: t.route, text: `Your ${t.name} is ready` })
  }
  if (session) notes.push({ href: '/dashboard/sessions', text: `${sessionTypeLabel(session.session_type)} requested. Our team will confirm shortly` })
  const nextTool = TOOLS.find((t) => tools.find((r) => r.tool === t.id)?.status !== 'ready')
  if (nextTool) notes.push({ href: nextTool.route, text: `Next up: ${nextTool.name}` })

  return (
    <header className="studio-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="studio-head-actions no-print">
        <Link href="/dashboard/sessions" className="btn btn-accent btn-sm book-mentor">
          <Icon name="calendar" size="1rem" />
          <span className="book-mentor-label">Book Mentor Session</span>
        </Link>
        <Notifications notes={notes} />
        <AccountMenu initials={initials(user.name)} name={user.name ?? user.email} />
      </div>
    </header>
  )
}
