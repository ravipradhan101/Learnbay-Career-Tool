import { body, leadFor, staffGuard } from '@/lib/crm/guard'
import {
  addMeetingLink, addNote, addTask, bookMeeting, cancelLeadMeeting, completeTask, emailReport, generateReport, reassign, sendLeadEmail, setStatus, updateProfile, type Result,
} from '@/lib/crm/lead-actions'
import { jsonError, jsonOk } from '@/lib/security'

// Building a report can take a minute or two.
export const maxDuration = 180

/** Everything staff do on one lead, as { action, ...fields }. Each action re-checks that the lead is in their scope. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  const lead = await leadFor(me, (await params).id)
  if (lead instanceof Response) return lead
  const b = await body(request)
  let r: Result
  switch (b.action) {
    case 'status': r = await setStatus(me, lead, b.status); break
    case 'reassign': r = await reassign(me, lead, b.to, b.note); break
    case 'profile': r = await updateProfile(me, lead, b); break
    case 'note': r = await addNote(me, lead, b.text); break
    case 'task': r = await addTask(me, lead, b); break
    case 'complete': r = await completeTask(me, lead, b.taskId, b); break
    case 'email': r = await sendLeadEmail(me, lead, b); break
    case 'generate': r = await generateReport(me, lead, b.tool); break
    case 'email-report': r = await emailReport(me, lead, b.tool); break
    case 'meeting': r = await bookMeeting(me, lead, b); break
    case 'meeting-cancel': r = await cancelLeadMeeting(me, lead, b); break
    case 'meeting-link': r = await addMeetingLink(me, lead, b); break
    default: return jsonError(400, 'Unknown action.')
  }
  return r.ok ? jsonOk({ message: r.message, ...r.data }) : jsonError(r.status, r.error, r.data)
}
