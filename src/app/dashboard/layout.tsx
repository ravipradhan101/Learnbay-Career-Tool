import type { Metadata } from 'next'
import { StudioChat, type StudioData } from '@/components/chat/StudioChat'
import { WhyLearnbay } from '@/components/why/WhyLearnbay'
import { programsForInterest } from '@/config/programs'
import { getStudio } from '@/lib/data'
import { queryOne } from '@/lib/db'
import { activeSetFor } from '@/lib/eligibility-sets'
import { allocateCounsellor } from '@/lib/counsellor-server'
import { ratingsOf } from '@/lib/reviews'
import { COUNSELLORS } from '@/lib/counsellors'
import { interestLabel, roleLabel } from '@/lib/questions'
import { reportCard, type ToolState } from '@/lib/report-card'
import { currentCtcRange } from '@/lib/tools'
import { TOOLS, type ToolId } from '@/lib/tools-meta'
import { firstName } from '@/lib/validation'

export const metadata: Metadata = { title: 'Career Studio', robots: { index: false, follow: false } }

/**
 * The signed-in studio: a left panel and the AI counsellor's chat in the centre. The chat lives here in the layout,
 * so it keeps its place while the learner moves between topics; pages only add panels over it.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, answers, tools, hasSession, latestSession } = await getStudio()
  const [set, counsellor, meta] = await Promise.all([
    activeSetFor(answers.interest),
    allocateCounsellor(user.id),
    queryOne<{ elig: boolean; chat: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM eligibility_tests WHERE user_id = $1 AND status = 'completed') AS elig,
              EXISTS (SELECT 1 FROM chat_messages WHERE user_id = $1) AS chat`,
      [user.id],
    ),
  ])
  const counsellorRatings = await ratingsOf(COUNSELLORS.map((c) => c.id))
  const counsellorRating = counsellorRatings[counsellor.id] ?? null
  const current = currentCtcRange(answers)
  const toolStates = Object.fromEntries(TOOLS.map((t) => {
    const row = tools.find((r) => r.tool === t.id)
    const state: ToolState = { status: row?.status ?? 'none', card: row?.status === 'ready' && row.data ? reportCard(t.id, row.data, current) : null }
    return [t.id, state]
  })) as Record<ToolId, ToolState>
  const program = programsForInterest(answers.interest)[0]
  const data: StudioData = {
    userId: user.id,
    name: user.name ?? user.email,
    first: firstName(user.name),
    answers,
    tools: toolStates,
    eligibilityVisible: Boolean(set),
    eligibilityDone: Boolean(meta?.elig),
    hasSession,
    latestSession: latestSession ? { preferred_date: latestSession.preferred_date, preferred_time: latestSession.preferred_time, status: latestSession.status } : null,
    firstTime: !meta?.chat,
    counsellor,
    counsellorRating,
    counsellorRatings,
    phoneMasked: user.phone ? `${user.phone_country ?? ''} ••••• ${user.phone.slice(-4)}`.trim() : 'your registered number',
  }
  return (
    <StudioChat data={data}>
      {children}
      <WhyLearnbay profile={{ role: roleLabel(answers), interest: interestLabel(answers), city: answers.city ?? null, program: { name: program.name, url: program.url, features: program.features } }} />
    </StudioChat>
  )
}
