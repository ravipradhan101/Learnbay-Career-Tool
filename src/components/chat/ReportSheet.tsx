import Link from 'next/link'
import { Icon } from '../Icon'
import { ResumeReview } from '../tools/ResumeReview'
import { ToolActions } from '../tools/ToolActions'
import { RoadmapView, SalaryView, SkillGapView, type ReportExtras } from '../tools/ToolViews'
import { Sheet } from './Sheet'
import { queryOne } from '@/lib/db'
import { activeSetFor } from '@/lib/eligibility-sets'
import { getResumeAnalysis, getStudio } from '@/lib/data'
import { domainLabel, experienceLabel, interestLabel, labelOf, PROGRAMMER, roleLabel, targetRoleLabel, WEEKLY_HOURS } from '@/lib/questions'
import { currentCtcRange } from '@/lib/tools'
import { getTool, type ToolId } from '@/lib/tools-meta'
import type { RoadmapResult, SalaryResult, SkillGapResult } from '@/lib/tool-types'
import { industriesFor } from '@/lib/projects'

/** Industries worth naming in the report ("including your healthcare domain"); not student, business or IT services. */
const INDUSTRY_DOMAINS = new Set(['bfsi', 'telecom', 'manufacturing', 'healthcare', 'retail', 'education', 'government', 'other'])

/** The full report, opened from the chat's report card. Closing it returns to the same place in the chat. */
export async function ReportSheet({ id }: { id: ToolId }) {
  const meta = getTool(id)!
  const { user, answers, tools, hasSession } = await getStudio()
  const row = tools.find((t) => t.tool === id)
  const back = meta.route
  if (row?.status !== 'ready' || !row.data) {
    return (
      <Sheet title={meta.name} closeHref={back}>
        <div className="card stack" style={{ alignItems: 'flex-start' }}>
          <p className="muted">This report isn&apos;t ready yet. Your counsellor will build it with you in the chat in about a minute.</p>
          <Link href={back} scroll={false} className="btn btn-primary">Back to the chat <Icon name="arrowRight" size="1rem" /></Link>
        </div>
      </Sheet>
    )
  }
  const [resume, elig, set] = await Promise.all([
    id === 'skill-gap' ? getResumeAnalysis(user.id) : Promise.resolve(null),
    queryOne<{ status: string }>(`SELECT status FROM eligibility_tests WHERE user_id = $1 AND status = 'completed' LIMIT 1`, [user.id]),
    activeSetFor(answers.interest),
  ])
  // Who the report is for, in their own answers (shown at the top of "Your plan with Learnbay").
  const profile = [
    { label: 'Current role', value: roleLabel(answers) },
    { label: 'Experience', value: experienceLabel(answers) },
    { label: 'Industry', value: domainLabel(answers) ?? '' },
    { label: 'Codes', value: labelOf(PROGRAMMER, answers.programmer) ?? '' },
    { label: 'Aiming for', value: targetRoleLabel(answers) },
    { label: 'Time a week', value: labelOf(WEEKLY_HOURS, answers.weeklyHours) ?? '' },
  ].filter((x) => x.value && x.value !== 'Not specified')
  const extras: ReportExtras = { area: interestLabel(answers), role: roleLabel(answers), eligibilityDone: elig?.status === 'completed' || !set, hasSession, industry: INDUSTRY_DOMAINS.has(answers.domain ?? '') ? domainLabel(answers) ?? null : null, profile, industries: industriesFor(answers) }
  return (
    <Sheet title={meta.name} closeHref={back}>
      <div className="row between no-print">
        <span className="pill success"><Icon name="checkCircle" size="0.9rem" /> Your full report</span>
        <ToolActions toolId={id} toolName={meta.name} shared={Boolean(row.share_token)} email={user.email} />
      </div>
      {id === 'skill-gap' && <SkillGapView r={row.data as SkillGapResult} extras={extras} />}
      {id === 'salary' && <SalaryView r={row.data as SalaryResult} current={currentCtcRange(answers)} extras={extras} />}
      {id === 'roadmap' && <RoadmapView r={row.data as RoadmapResult} extras={extras} />}
      {id === 'skill-gap' && <ResumeReview initial={resume?.data ?? null} />}
    </Sheet>
  )
}
