import { programsForInterest } from '@/config/programs'
import { queryOne } from '../db'
import { activeSetFor } from '../eligibility-sets'
import { interestLabel, roleLabel, targetRoleLabel, type Answers } from '../questions'
import { TOOLS, type ToolId } from '../tools-meta'
import type { ConditionId } from './catalog'
import type { MergeVars } from './render'

/** Everything the automation needs to know about one learner, loaded in a single query. */
export type LearnerContext = {
  userId: string
  email: string
  name: string | null
  optedOut: boolean
  verified: boolean
  onboarded: boolean
  answers: Answers
  toolsReady: ToolId[]
  sessionBooked: boolean
  eligibility: { status: string; score: number | null } | null
  /** False when the admin has paused the test for this learner's program area. */
  eligibilityAvailable: boolean
  resume: boolean
  lastActiveAt: Date
}

export async function loadContext(userId: string): Promise<LearnerContext | null> {
  const r = await queryOne<{
    id: string; email: string; name: string | null; phone: string | null; opted_out: boolean; verified: boolean; answers: Answers | null
    ready: ToolId[] | null; booked: boolean; elig: { status: string; score: number | null } | null; resume: boolean; last_active: Date
  }>(
    `SELECT u.id, u.email, u.name, u.phone, u.marketing_opt_out_at IS NOT NULL AS opted_out, u.email_verified_at IS NOT NULL AS verified, a.answers,
            (SELECT array_agg(tool) FROM tool_results t WHERE t.user_id = u.id AND t.status = 'ready') AS ready,
            (EXISTS (SELECT 1 FROM counsellor_requests c WHERE c.user_id = u.id) OR EXISTS (SELECT 1 FROM call_requests cr WHERE cr.user_id = u.id)) AS booked,
            (SELECT json_build_object('status', 'completed', 'score', max(e.score)) FROM eligibility_tests e WHERE e.user_id = u.id AND e.status = 'completed' HAVING count(*) > 0) AS elig,
            EXISTS (SELECT 1 FROM resume_analyses r WHERE r.user_id = u.id) AS resume,
            GREATEST(u.created_at, coalesce(u.last_login_at, u.created_at),
                     coalesce((SELECT max(created_at) FROM analytics_events ev WHERE ev.user_id = u.id), u.created_at)) AS last_active
       FROM users u LEFT JOIN assessments a ON a.user_id = u.id WHERE u.id = $1`,
    [userId],
  )
  if (!r) return null
  const answers = r.answers ?? {}
  const eligibilityAvailable = Boolean(await activeSetFor(answers.interest))
  return {
    userId: r.id, email: r.email, name: r.name, optedOut: r.opted_out, verified: r.verified,
    onboarded: Boolean(answers.interest && r.phone), answers, toolsReady: r.ready ?? [], sessionBooked: r.booked,
    eligibility: r.elig, eligibilityAvailable, resume: r.resume, lastActiveAt: new Date(r.last_active),
  }
}

export function checkCondition(id: ConditionId, c: LearnerContext): boolean {
  const done = c.toolsReady.length
  const eligDone = c.eligibility?.status === 'completed'
  const idleDays = (Date.now() - c.lastActiveAt.getTime()) / 86_400_000
  switch (id) {
    case 'onboarded': return c.onboarded
    case 'no_tools': return done === 0
    case 'has_tool': return done > 0
    case 'not_all_tools': return done < TOOLS.length
    case 'all_tools': return done >= TOOLS.length
    case 'no_session': return !c.sessionBooked
    case 'has_session': return c.sessionBooked
    case 'no_eligibility': return !eligDone && c.eligibilityAvailable
    case 'eligibility_done': return eligDone
    case 'no_resume': return !c.resume
    case 'inactive_3d': return idleDays >= 3
    case 'inactive_7d': return idleDays >= 7
  }
}

export function mergeVars(c: LearnerContext): MergeVars {
  const first = (c.name ?? '').trim().split(/\s+/)[0] || 'there'
  const nextTool = TOOLS.find((t) => !c.toolsReady.includes(t.id))
  const eligDone = c.eligibility?.status === 'completed'
  const area = c.answers.interest ? interestLabel(c.answers) : 'tech'
  const target = c.answers.targetRole && c.answers.targetRole !== 'not-sure' ? targetRoleLabel(c.answers) : area
  const next = nextTool
    ? { label: `Finish your ${nextTool.name}`, path: nextTool.route }
    : !eligDone && c.eligibilityAvailable
      ? { label: 'Take the eligibility test', path: '/dashboard/eligibility' }
      : !c.sessionBooked
        ? { label: 'Book your free 1:1 session', path: '/dashboard/sessions' }
        : { label: 'Open my Career Studio', path: '/dashboard' }
  return {
    first_name: first.charAt(0).toUpperCase() + first.slice(1),
    program_area: area,
    target_role: target,
    current_role: c.answers.role ? roleLabel(c.answers) : 'your current role',
    program_name: programsForInterest(c.answers.interest)[0].name,
    tools_done: String(c.toolsReady.length),
    next_tool_name: nextTool?.name ?? 'Career Roadmap',
    next_tool_path: nextTool?.route ?? '/dashboard',
    next_step_label: next.label,
    next_step_path: next.path,
    eligibility_status: eligDone ? `Completed${c.eligibility?.score !== null && c.eligibility?.score !== undefined ? ` (score ${c.eligibility.score}/100)` : ''}` : 'Not taken yet',
  }
}
