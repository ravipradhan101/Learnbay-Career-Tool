import { query } from '../db'
import { env } from '../env'
import { sendMail } from '../mailer'
import { syncTasks } from './tasks'
import { TASK_KIND_LABEL } from './roles'

/**
 * Daily (from the cron): bring calls up to date, then email each team member their open calls and reminders for
 * today, overdue ones first. People with nothing due get no email.
 */
export async function dailyCrmDigest(): Promise<{ sent: number }> {
  await syncTasks(true)
  const rows = await query<{ owner_id: string; email: string; name: string | null; kind: string; title: string; due_at: Date; lead: string }>(
    `SELECT t.owner_id, a.email, a.name, t.kind, t.title, t.due_at, coalesce(u.name, u.email) AS lead
       FROM lead_tasks t JOIN admin_users a ON a.id = t.owner_id AND a.active JOIN users u ON u.id = t.user_id
      WHERE t.status = 'open' AND t.due_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata'
      ORDER BY t.owner_id, t.due_at`,
  )
  const byOwner = new Map<string, typeof rows>()
  for (const r of rows) byOwner.set(r.owner_id, [...(byOwner.get(r.owner_id) ?? []), r])
  let sent = 0
  for (const list of byOwner.values()) {
    const now = Date.now()
    const time = (d: Date) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    const line = (r: (typeof rows)[number]) => `${time(r.due_at)} · ${TASK_KIND_LABEL[r.kind] ?? r.kind}: ${r.lead}${r.title ? ` (${r.title})` : ''}`
    const overdue = list.filter((r) => new Date(r.due_at).getTime() < now)
    const today = list.filter((r) => new Date(r.due_at).getTime() >= now)
    try {
      await sendMail({
        to: list[0].email,
        subject: `Today: ${list.length} call${list.length === 1 ? '' : 's'} and reminder${list.length === 1 ? '' : 's'}${overdue.length ? ` (${overdue.length} overdue)` : ''}`,
        heading: `Good morning${list[0].name ? `, ${list[0].name.split(' ')[0]}` : ''}`,
        paragraphs: ['Here is what is due today in the sales CRM. Booked calls count as missed 1 hour after the slot, and call requests after 1 working day.'],
        sections: [{ title: 'Overdue', items: overdue.slice(0, 30).map(line) }, { title: 'Due today', items: today.slice(0, 30).map(line) }],
        cta: { label: 'Open my calls', url: `${env.appUrl}/admin/crm/tasks` },
      })
      sent++
    } catch (err) {
      console.error('[crm] digest failed', (err as Error).message)
    }
  }
  return { sent }
}
