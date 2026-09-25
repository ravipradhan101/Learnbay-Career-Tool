// Client-safe catalog for the email automation: triggers, conditions and merge tags.
// The admin editor and the sending engine both read from here, so they can never disagree.

export const TRIGGERS = [
  { id: 'signup', label: 'Signs up (email confirmed for the first time)' },
  { id: 'login', label: 'Logs in again (returning learner)' },
  { id: 'tool_completed', label: 'Finishes a tool report' },
  { id: 'session_booked', label: 'Books a 1:1 session' },
  { id: 'eligibility_completed', label: 'Completes the eligibility test' },
] as const
export type TriggerId = (typeof TRIGGERS)[number]['id']
export const isTrigger = (v: unknown): v is TriggerId => TRIGGERS.some((t) => t.id === v)

export const CONDITIONS = [
  { id: 'onboarded', label: 'Has finished the quick start' },
  { id: 'no_tools', label: 'Has no tool report yet' },
  { id: 'has_tool', label: 'Has at least one tool report' },
  { id: 'not_all_tools', label: 'Has not finished all 3 tools' },
  { id: 'all_tools', label: 'Has finished all 3 tools' },
  { id: 'no_session', label: 'Has not booked a 1:1 session' },
  { id: 'has_session', label: 'Has booked a 1:1 session' },
  { id: 'no_eligibility', label: 'Has not completed the eligibility test' },
  { id: 'eligibility_done', label: 'Has completed the eligibility test' },
  { id: 'no_resume', label: 'Has not uploaded a resume' },
  { id: 'inactive_3d', label: 'No activity in the last 3 days' },
  { id: 'inactive_7d', label: 'No activity in the last 7 days' },
] as const
export type ConditionId = (typeof CONDITIONS)[number]['id']
export const isCondition = (v: unknown): v is ConditionId => CONDITIONS.some((c) => c.id === v)

/** Conditions that can end a whole flow early (the goal was reached, so stop nudging). */
export const EXIT_CONDITIONS: ConditionId[] = ['all_tools', 'has_session', 'eligibility_done']

export const MERGE_TAGS = [
  { tag: 'first_name', label: 'First name', sample: 'Priya' },
  { tag: 'program_area', label: 'Program area they chose', sample: 'AI & GenAI' },
  { tag: 'target_role', label: 'Target role (or program area if not chosen yet)', sample: 'AI Engineer' },
  { tag: 'current_role', label: 'Current role', sample: 'QA Engineer' },
  { tag: 'program_name', label: 'Best-fit Learnbay program', sample: 'GenAI & Agentic AI Master Program' },
  { tag: 'tools_done', label: 'Tool reports finished (0-3)', sample: '1' },
  { tag: 'next_tool_name', label: 'Next tool to do', sample: 'Salary Benchmark' },
  { tag: 'next_tool_path', label: 'Link path of the next tool (use as button link)', sample: '/dashboard/salary' },
  { tag: 'next_step_label', label: 'Best next action (tool → eligibility test → 1:1 session)', sample: 'Finish your Salary Benchmark' },
  { tag: 'next_step_path', label: 'Link path of the best next action', sample: '/dashboard/salary' },
  { tag: 'eligibility_status', label: 'Eligibility test status', sample: 'Not taken yet' },
] as const

export const LINK_PATHS = [
  { path: '{{next_step_path}}', label: 'Best next action (automatic)' },
  { path: '{{next_tool_path}}', label: 'Next tool (automatic)' },
  { path: '/dashboard', label: 'Studio home' },
  { path: '/dashboard/skill-gap', label: 'Skill Gap Analysis' },
  { path: '/dashboard/salary', label: 'Salary Benchmark' },
  { path: '/dashboard/roadmap', label: 'Career Roadmap' },
  { path: '/dashboard/eligibility', label: 'Eligibility test' },
  { path: '/dashboard/sessions', label: 'Book a 1:1 session' },
  { path: '/dashboard/masterclasses', label: 'Masterclasses' },
]

/** Button links must stay inside the app: an internal path or one of the automatic tags. */
export function isValidCtaPath(p: string): boolean {
  return p === '{{next_step_path}}' || p === '{{next_tool_path}}' || /^\/[a-z0-9\-/]*$/i.test(p)
}

export function describeDelay(minutes: number): string {
  if (minutes <= 0) return 'Immediately'
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? '' : 's'} later`
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'} later`
  return `${minutes} minutes later`
}
