import { AdvisorHome } from '@/components/studio/AdvisorHome'
import { JourneyProgress } from '@/components/studio/JourneyProgress'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { Testimonials } from '@/components/Testimonials'
import { WhyLearnbayTeaser } from '@/components/why/WhyLearnbayButton'
import { getConversation, getStudio } from '@/lib/data'
import { queryOne } from '@/lib/db'
import { activeSetFor } from '@/lib/eligibility-sets'
import { TOOLS } from '@/lib/tools-meta'
import { firstName } from '@/lib/validation'

export default async function StudioHome() {
  const { user, answers, tools, hasSession } = await getStudio()
  const [convo, elig, set] = await Promise.all([
    getConversation(user.id, 'advisor'),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM eligibility_tests WHERE user_id = $1 AND status = 'completed'`, [user.id]),
    activeSetFor(answers.interest),
  ])
  const done = TOOLS.filter((t) => tools.find((r) => r.tool === t.id)?.status === 'ready').map((t) => t.id)
  const steps = [
    ...TOOLS.map((t) => ({ label: t.name.replace(' Analysis', '').replace(' Benchmark', ''), href: t.route, done: done.includes(t.id) })),
    // Only while the admin has the test switched on (activeSetFor returns null when it is hidden).
    ...(set ? [{ label: 'Eligibility test', href: '/dashboard/eligibility', done: Boolean(elig?.n) }] : []),
    { label: 'Free 1:1 session', href: '/dashboard/sessions', done: hasSession },
  ]
  return (
    <>
      <StudioHeader title="Your career, with a clear next step." subtitle="A little clarity today. A smarter career move tomorrow." />
      <JourneyProgress steps={steps} />
      <AdvisorHome
        userId={user.id}
        name={firstName(user.name)}
        done={done}
        initialMessages={convo.messages}
        initialConversationId={convo.conversationId}
      />
      <WhyLearnbayTeaser source="home" />
      <Testimonials />
    </>
  )
}
