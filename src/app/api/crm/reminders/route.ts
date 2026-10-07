import { myDueCount } from '@/lib/crm/data'
import { staffGuard } from '@/lib/crm/guard'
import { syncTasks } from '@/lib/crm/tasks'
import { jsonOk } from '@/lib/security'

/** Polled by the CRM header every minute: how many of my calls and reminders are due now. */
export async function GET(request: Request) {
  const me = await staffGuard(request, false)
  if (me instanceof Response) return me
  await syncTasks()
  return jsonOk(await myDueCount(me))
}
