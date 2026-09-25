import Link from 'next/link'
import { AssistantChat } from '../AssistantChat'
import { Icon } from '../Icon'
import { ProofStrip } from '../ProofStrip'
import { Testimonials } from '../Testimonials'
import { StudioHeader } from '../studio/StudioHeader'
import { ResumeReview } from './ResumeReview'
import { ToolActions } from './ToolActions'
import { ToolRunner } from './ToolRunner'
import { RoadmapView, SalaryView, SkillGapView, type ReportExtras } from './ToolViews'
import { queryOne } from '@/lib/db'
import { activeSetFor } from '@/lib/eligibility-sets'
import { getConversation, getResumeAnalysis, getStudio } from '@/lib/data'
import { interestLabel, isAnswered, roleLabel, targetRoleOptions } from '@/lib/questions'
import { currentCtcRange } from '@/lib/tools'
import { TOOLS, getTool, type ToolId } from '@/lib/tools-meta'
import type { RoadmapResult, SalaryResult, SkillGapResult } from '@/lib/tool-types'

const CHAT_SUGGESTIONS: Record<ToolId, string[]> = {
  'skill-gap': ['Which gap should I close first?', 'How long will it take to close these gaps?', 'Which projects prove these skills?'],
  salary: ['How can I reach the top of this range?', 'Which certification moves salary most?', 'Is switching worth it for me?'],
  roadmap: ['Can I finish this faster?', 'What if I only have weekends?', 'How does the program fit this plan?'],
}

export async function ToolPage({ id }: { id: ToolId }) {
  const meta = getTool(id)!
  const { user, answers, tools } = await getStudio()
  const row = tools.find((t) => t.tool === id)
  const missing = meta.questions.filter((q) => !isAnswered(answers, q))
  const ready = row?.status === 'ready' && row.data

  if (!ready) {
    return (
      <>
        <StudioHeader title={meta.name} subtitle={meta.tagline} />
        <ToolRunner tool={{ id: meta.id, name: meta.name, generating: meta.generating, preview: meta.preview }} missing={missing} targetOptions={targetRoleOptions(answers)} status={row?.status ?? 'none'} />
        <Testimonials />
      </>
    )
  }

  const [convo, resume, elig, eligSet] = await Promise.all([
    getConversation(user.id, id),
    id === 'skill-gap' ? getResumeAnalysis(user.id) : Promise.resolve(null),
    queryOne<{ status: string }>(`SELECT status FROM eligibility_tests WHERE user_id = $1 AND status = 'completed' LIMIT 1`, [user.id]),
    activeSetFor(answers.interest),
  ])
  const extras: ReportExtras = { area: interestLabel(answers), role: roleLabel(answers), eligibilityDone: elig?.status === 'completed' || !eligSet }
  const nextTools = TOOLS.filter((t) => t.id !== id)

  return (
    <>
      <StudioHeader title={meta.name} subtitle={meta.tagline} />
      <div className="row between no-print">
        <span className="pill success"><Icon name="checkCircle" size="0.9rem" /> Your analysis is ready</span>
        <ToolActions toolId={id} toolName={meta.name} shared={Boolean(row.share_token)} email={user.email} />
      </div>

      {id === 'skill-gap' && <SkillGapView r={row.data as SkillGapResult} extras={extras} />}
      {id === 'salary' && <SalaryView r={row.data as SalaryResult} current={currentCtcRange(answers)} extras={extras} />}
      {id === 'roadmap' && <RoadmapView r={row.data as RoadmapResult} extras={extras} />}

      {id === 'skill-gap' && <ResumeReview initial={resume?.data ?? null} />}

      <details className="more ask-more no-print" open={convo.messages.length > 0}>
        <summary><span><Icon name="message" size="1.1rem" className="text-primary" /> Questions about this report? Ask Career AI</span><Icon name="chevronDown" size="1rem" className="more-chev" /></summary>
        <div className="more-body">
        <AssistantChat
          context={id}
          signedIn
          initialMessages={convo.messages}
          initialConversationId={convo.conversationId}
          suggestions={CHAT_SUGGESTIONS[id]}
          placeholder={`Ask about your ${meta.name.toLowerCase()}...`}
        />
        </div>
      </details>

      <nav className="next-tiles no-print" aria-label="What to do next">
        {nextTools.map((t) => {
          const done = tools.find((r) => r.tool === t.id)?.status === 'ready'
          return (
            <Link key={t.id} href={t.route} className="next-tile">
              <span className="fc-icon"><Icon name={t.icon} /></span>
              <b>{done ? 'View' : 'Next:'} {t.name}</b>
              {done ? <span className="pill success">Ready</span> : <span className="pill primary">~2 min</span>}
            </Link>
          )
        })}
        <Link href="/dashboard/sessions" className="next-tile accent">
          <span className="fc-icon"><Icon name="calendar" /></span>
          <b>Free 1:1 with a mentor</b>
          <span className="pill">30 min</span>
        </Link>
      </nav>
    </>
  )
}
