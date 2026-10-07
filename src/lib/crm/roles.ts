// Labels and rules for the sales team (staff) side. No server imports, so client components can use it too.

export type StaffRole = 'admin' | 'manager' | 'associate' | 'ism'
export type ActorKind = StaffRole | 'system' | 'user'

export const ROLE_LABEL: Record<StaffRole, string> = { admin: 'Admin', manager: 'Manager', associate: 'Associate', ism: 'ISM' }
export const ACTOR_LABEL: Record<ActorKind, string> = { ...ROLE_LABEL, system: 'System', user: 'Learner' }
export const ROLE_ORDER: StaffRole[] = ['admin', 'manager', 'associate', 'ism']

export const LEAD_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'not_interested', label: 'Not interested' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'lost', label: 'Lost' },
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]['id']
export const isLeadStatus = (v: unknown): v is LeadStatus => LEAD_STATUSES.some((s) => s.id === v)
export const statusLabel = (id: string | null | undefined) => LEAD_STATUSES.find((s) => s.id === id)?.label ?? 'New'

export const SOURCE_LABEL: Record<string, string> = {
  crm: 'CRM owner', round_robin: 'Round robin', manual: 'Assigned', self: 'Self-created',
}

export const TASK_KIND_LABEL: Record<string, string> = {
  call_booked: 'Booked call', call_request: 'Call request', follow_up: 'Follow-up call', reminder: 'Reminder', meeting: 'Meeting',
}
/** Call outcomes a staff member can log. `connected` closes the call; the others still count as attempted. */
export const CALL_OUTCOMES = [
  { id: 'connected', label: 'Connected, spoke to them' },
  { id: 'no_answer', label: 'No answer' },
  { id: 'busy', label: 'Busy / call back later' },
  { id: 'wrong_number', label: 'Wrong number' },
  { id: 'not_interested', label: 'Not interested' },
  { id: 'enrolled', label: 'Enrolled' },
] as const
export const isOutcome = (v: unknown): v is (typeof CALL_OUTCOMES)[number]['id'] => CALL_OUTCOMES.some((o) => o.id === v)
export const outcomeLabel = (id: string | null | undefined) =>
  CALL_OUTCOMES.find((o) => o.id === id)?.label ?? (id === 'rescheduled' ? 'Moved by the learner after it was missed' : id === 'done' ? 'Done' : id ?? '')

/** Everything staff can do on a lead, as recorded in lead_activities. */
export const ACTION_LABEL: Record<string, string> = {
  lead_created: 'Created the lead',
  allocated: 'Allocated the lead',
  reassigned: 'Reassigned the lead',
  status_changed: 'Changed the status',
  profile_updated: 'Updated profile details',
  report_generated: 'Generated a report',
  report_emailed: 'Emailed a report',
  email_sent: 'Sent an email',
  note_added: 'Added a note',
  task_created: 'Set a reminder',
  call_logged: 'Logged a call',
  task_done: 'Completed a reminder',
  meeting_booked: 'Booked a meeting',
  meeting_cancelled: 'Cancelled a meeting',
  meeting_link: 'Added a Google Meet link',
}
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a.replace(/_/g, ' ')

/** What each role may do. The server enforces all of it; the UI only uses this to hide what would be refused. */
export const CAN = {
  seeAllLeads: (r: StaffRole) => r === 'admin',
  manageStaff: (r: StaffRole) => r === 'admin' || r === 'manager',
  /** Pause an ISM's round robin, deactivate accounts, change roles, distribute unassigned leads. */
  adminOnly: (r: StaffRole) => r === 'admin',
  reassign: (r: StaffRole) => r !== 'ism',
  openAdminReports: (r: StaffRole) => r === 'admin',
}

/** Roles a person may create: admin any (except admin); a manager adds associates and ISMs under themselves. */
export function creatableRoles(r: StaffRole): StaffRole[] {
  if (r === 'admin') return ['manager', 'associate', 'ism']
  if (r === 'manager') return ['associate', 'ism']
  return []
}
