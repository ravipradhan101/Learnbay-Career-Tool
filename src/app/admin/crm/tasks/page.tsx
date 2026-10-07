import Link from 'next/link'
import { TaskTable } from '@/components/crm/parts'
import { requireStaff } from '@/lib/admin-auth'
import { listTasks, type TaskView } from '@/lib/crm/data'
import { byId, displayName, staffDirectory, visibleIds } from '@/lib/crm/scope'
import { syncTasks } from '@/lib/crm/tasks'

export const metadata = { title: 'Calls & reminders' }

const VIEWS: { id: TaskView; label: string; note: string }[] = [
  { id: 'due', label: 'Due today & overdue', note: 'Open calls and reminders up to the end of today (IST).' },
  { id: 'upcoming', label: 'Upcoming', note: 'Open, due tomorrow or later.' },
  { id: 'missed', label: 'Missed calls', note: 'Booked calls with no outcome within 1 hour of the slot, and call requests not returned within 1 working day (10 AM–8 PM IST). Last 30 days.' },
  { id: 'done', label: 'Done', note: 'Closed in the last 14 days.' },
]

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireStaff()
  await syncTasks()
  const sp = await searchParams
  const view = VIEWS.find((v) => v.id === sp.view)?.id ?? 'due'
  const dir = await staffDirectory()
  const visible = visibleIds(me, dir)
  const owner = typeof sp.owner === 'string' && visible.has(sp.owner) ? sp.owner : ''
  const mine = sp.mine === '1' || (me.role === 'ism')
  const tasks = await listTasks(me, view, owner, mine)
  const link = (patch: Record<string, string>) => `/admin/crm/tasks?${new URLSearchParams(Object.entries({ view, owner, mine: mine && me.role !== 'ism' ? '1' : '', ...patch }).filter(([, v]) => v))}`

  return (
    <>
      <div>
        <h1 className="admin-h1">Calls & reminders</h1>
        <p className="muted small">{VIEWS.find((v) => v.id === view)?.note}</p>
      </div>
      <div className="row between">
        <nav className="range-pills" aria-label="View">
          {VIEWS.map((v) => <Link key={v.id} href={link({ view: v.id })} aria-current={v.id === view ? 'true' : undefined}>{v.label}</Link>)}
        </nav>
        {me.role !== 'ism' && (
          <form method="get" className="row" style={{ gap: '0.5rem' }}>
            <input type="hidden" name="view" value={view} />
            <select className="select" name="owner" defaultValue={owner} aria-label="Owner">
              <option value="">Everyone in my scope</option>
              {dir.filter((s) => visible.has(s.id)).map((s) => <option key={s.id} value={s.id}>{displayName(s)} · {s.role.toUpperCase()}</option>)}
            </select>
            <label className="small row" style={{ gap: '0.35rem' }}><input type="checkbox" name="mine" value="1" defaultChecked={mine} /> Only mine</label>
            <button className="btn btn-soft btn-sm">Show</button>
          </form>
        )}
      </div>
      <TaskTable tasks={tasks} people={byId(dir)} canAct={view !== 'done'} />
    </>
  )
}
