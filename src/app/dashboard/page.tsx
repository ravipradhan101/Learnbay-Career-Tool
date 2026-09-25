import { AdvisorHome } from '@/components/studio/AdvisorHome'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { ProofStrip } from '@/components/ProofStrip'
import { Testimonials } from '@/components/Testimonials'
import { WhyLearnbayTeaser } from '@/components/why/WhyLearnbayButton'
import { getConversation, getStudio } from '@/lib/data'
import { TOOLS } from '@/lib/tools-meta'
import { firstName } from '@/lib/validation'

export default async function StudioHome() {
  const { user, tools } = await getStudio()
  const convo = await getConversation(user.id, 'advisor')
  const done = TOOLS.filter((t) => tools.find((r) => r.tool === t.id)?.status === 'ready').map((t) => t.id)
  return (
    <>
      <StudioHeader title="Your career, with a clear next step." subtitle="A little clarity today. A smarter career move tomorrow." />
      <AdvisorHome
        userId={user.id}
        name={firstName(user.name)}
        done={done}
        initialMessages={convo.messages}
        initialConversationId={convo.conversationId}
      />
      <WhyLearnbayTeaser source="home" />
      <Testimonials />
      <ProofStrip />
    </>
  )
}
