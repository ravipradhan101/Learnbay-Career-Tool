import Link from 'next/link'
import { AssistantChat } from '@/components/AssistantChat'
import { Icon } from '@/components/Icon'
import { Sparkle } from '@/components/Sparkle'
import { Testimonials } from '@/components/Testimonials'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { getConversation, getStudio } from '@/lib/data'
import { env } from '@/lib/env'

export const metadata = { title: 'AI Counselling' }

export default async function CounsellingPage() {
  const { user } = await getStudio()
  const convo = await getConversation(user.id, 'advisor')
  const voiceHref = env.voiceAssistantUrl || (env.voiceAssistantPhone ? `tel:${env.voiceAssistantPhone.replace(/[^\d+]/g, '')}` : '')
  return (
    <>
      <StudioHeader title="AI Counselling" subtitle="Talk your career decision through with AI, any time — and book a 1:1 with a mentor when you are ready." />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="advisor">
          <div className="advisor-head">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="sparkle"><Sparkle size="1.6rem" /></span>
              <div><b>AI Career Counsellor</b><span>Knows your profile and results</span></div>
            </div>
          </div>
          <AssistantChat
            context="advisor"
            signedIn
            initialMessages={convo.messages}
            initialConversationId={convo.conversationId}
            greeting="Tell me what is on your mind — a role you are unsure about, a switch you are weighing, or where to start."
            suggestions={['Is a career switch right for me?', 'Which program fits my background?', 'How do I balance learning with work?']}
          />
        </section>
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title"><Icon name="mic" className="text-primary" /> Voice counselling</h2>
            {voiceHref
              ? <><p className="small muted">Prefer to talk? Call our AI career assistant.</p><a className="btn btn-primary" href={voiceHref} target={env.voiceAssistantUrl ? '_blank' : undefined} rel="noopener noreferrer"><Icon name="phone" size="1rem" /> Call the AI assistant</a></>
              : <p className="small muted">Our AI voice assistant is coming soon. Until then, chat here or book a 1:1 with a mentor.</p>}
          </section>
          <section className="card stack">
            <h2 className="card-title"><Icon name="headset" className="text-primary" /> 1:1 counselling & mentor guidance</h2>
            <p className="small muted">Your path, the right program, fees, EMI and batch timings — pick a date and time and a Learnbay mentor will connect with you.</p>
            <Link href="/dashboard/sessions" className="btn btn-accent" style={{ alignSelf: 'flex-start' }}><Icon name="calendar" size="1rem" /> Book a 1:1 session</Link>
          </section>
        </div>
      </div>
      <Testimonials />
    </>
  )
}
