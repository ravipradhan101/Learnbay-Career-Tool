import { query } from './db'
import { getProgram } from '@/config/programs'
import { CITIES, CTC_BANDS, PROGRAMMER, TIMELINES, WEEKLY_HOURS, experienceLabel, interestLabel, labelOf, roleLabel, targetRoleLabel, type Answers } from './questions'
import { sessionTypeLabel } from './sessions'

type LeadRow = {
  id: string
  email: string
  name: string | null
  phone_country: string | null
  phone: string | null
  source: Record<string, string>
  created_at: Date
  answers: Answers | null
  tools_ready: string[] | null
  program_id: string | null
  readiness: number | null
  resume_score: number | null
  chat_questions: number
  session_type: string | null
  session_date: string | null
  session_time: string | null
  events: string[] | null
  verified: boolean
  eligibility_score: number | null
  opted_out: boolean
}

/** Lead score 0-100: intent (timeline, program interest), depth (tools used), and engagement. */
function score(r: LeadRow): number {
  let s = 0
  const a = r.answers
  if (a?.interest) s += 10
  if (a?.timeline === '3m') s += 20
  else if (a?.timeline === '6m') s += 12
  else if (a?.timeline === 'exploring') s -= 10
  const exp = a?.experience
  if (exp && exp !== '0') s += 8
  s += (r.tools_ready?.length ?? 0) * 8
  if (r.resume_score !== null) s += 8
  if (r.chat_questions >= 3) s += 8
  const ev = r.events ?? []
  if (ev.includes('brochure_click') || ev.includes('program_click')) s += 8
  if (ev.includes('masterclass_interest')) s += 5
  if (r.session_type) s += 25
  if (r.eligibility_score !== null) s += 15
  if (ev.includes('why_learnbay_completed')) s += 5
  if (!r.verified) s -= 10
  return Math.max(0, Math.min(100, s))
}

export async function listLeads(search: string, limit = 500) {
  const q = search.trim().toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`)
  const rows = await query<LeadRow>(
    `SELECT u.id, u.email, u.name, u.phone_country, u.phone, u.source, u.created_at, a.answers,
            (SELECT array_agg(tool) FROM tool_results t WHERE t.user_id = u.id AND t.status = 'ready') AS tools_ready,
            (SELECT data->>'programId' FROM tool_results t WHERE t.user_id = u.id AND t.status = 'ready' ORDER BY updated_at DESC LIMIT 1) AS program_id,
            (SELECT (data->'readiness'->>'score')::int FROM tool_results t WHERE t.user_id = u.id AND t.tool = 'skill-gap' AND t.status = 'ready') AS readiness,
            (ra.data->>'score')::int AS resume_score,
            (SELECT count(*)::int FROM chat_messages c WHERE c.user_id = u.id AND c.role = 'user') AS chat_questions,
            cr.session_type, to_char(cr.preferred_date, 'YYYY-MM-DD') AS session_date, cr.preferred_time AS session_time,
            (SELECT array_agg(DISTINCT type) FROM lead_events e WHERE e.user_id = u.id) AS events,
            u.email_verified_at IS NOT NULL AS verified, u.marketing_opt_out_at IS NOT NULL AS opted_out,
            (SELECT max(score) FROM eligibility_tests et WHERE et.user_id = u.id AND et.status = 'completed') AS eligibility_score
       FROM users u
       LEFT JOIN assessments a ON a.user_id = u.id
       LEFT JOIN resume_analyses ra ON ra.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT session_type, preferred_date, preferred_time FROM counsellor_requests WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
       ) cr ON true
      WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR coalesce(u.name, '') ILIKE '%' || $1 || '%' OR coalesce(u.phone, '') LIKE '%' || $1 || '%')
      ORDER BY u.created_at DESC
      LIMIT $2`,
    [q, limit],
  )
  return rows.map((r) => {
    const a = r.answers ?? {}
    const s = score(r)
    return {
      id: r.id,
      createdAt: r.created_at,
      name: r.name ?? '',
      email: r.email,
      phone: r.phone ? `${r.phone_country ?? ''} ${r.phone}`.trim() : '',
      role: r.answers ? roleLabel(a) : '',
      experience: r.answers ? experienceLabel(a) : '',
      codes: labelOf(PROGRAMMER, a.programmer) ?? '',
      interest: r.answers ? interestLabel(a) : '',
      targetRole: a.targetRole ? targetRoleLabel(a) : '',
      ctc: labelOf(CTC_BANDS, a.ctc) ?? '',
      city: labelOf(CITIES, a.city) ?? '',
      weeklyHours: labelOf(WEEKLY_HOURS, a.weeklyHours) ?? '',
      timeline: labelOf(TIMELINES, a.timeline) ?? '',
      tools: (r.tools_ready ?? []).join(', '),
      readiness: r.readiness,
      program: r.program_id ? getProgram(r.program_id).name : '',
      resumeScore: r.resume_score,
      chatQuestions: r.chat_questions,
      session: r.session_type ? `${sessionTypeLabel(r.session_type)}: ${r.session_date ?? ''} ${r.session_time ?? ''}`.trim() : '',
      events: (r.events ?? []).join(', '),
      verified: r.verified,
      eligibilityScore: r.eligibility_score,
      emailsOff: r.opted_out,
      source: [r.source?.utm_source, r.source?.utm_medium, r.source?.utm_campaign].filter(Boolean).join(' / '),
      score: s,
      temperature: s >= 60 ? 'Hot' : s >= 35 ? 'Warm' : 'Cold',
    }
  })
}

export type Lead = Awaited<ReturnType<typeof listLeads>>[number]
