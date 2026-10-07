import { body, leadFor, staffGuard } from '@/lib/crm/guard'
import {
  addMeetingLink, addNote, addTask, bookMeeting, cancelLeadMeeting, completeTask, emailReport, generateReport, reassign, regenerateReport, sendLeadEmail, type Result,
} from '@/lib/crm/lead-actions'
import { jsonError, jsonOk } from '@/lib/security'

// Building a report can take a minute or two.
export const maxDuration = 180

/**
 * Everything staff do on one lead, as { action, ...fields }. Each action re-checks that the lead is in their scope.
 * Status and the learner's profile are not editable here: status follows call outcomes and the main CRM.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  const lead = await leadFor(me, (await params).id)
  if (lead instanceof Response) return lead
  const b = await body(request)
  let r: Result
  switch (b.action) {
    case 'reassign': r = await reassign(me, lead, b.to, b.note); break
    case 'note': r = await addNote(me, lead, b.text); break
    case 'task': r = await addTask(me, lead, b); break
    case 'complete': r = await completeTask(me, lead, b.taskId, b); break
    case 'email': r = await sendLeadEmail(me, lead, b); break
    case 'generate': r = await generateReport(me, lead, b.tool); break
    case 'regenerate': r = await regenerateReport(me, lead, b.tool, b.answers); break
    case 'email-report': r = await emailReport(me, lead, b.tool); break
    case 'meeting': r = await bookMeeting(me, lead, b); break
    case 'meeting-cancel': r = await cancelLeadMeeting(me, lead, b); break
    case 'meeting-link': r = await addMeetingLink(me, lead, b); break
    default: return jsonError(400, 'Unknown action.')
  }
  return r.ok ? jsonOk({ message: r.message, ...r.data }) : jsonError(r.status, r.error, r.data)
}
