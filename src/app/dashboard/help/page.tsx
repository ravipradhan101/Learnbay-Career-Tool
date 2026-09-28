import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { AskAssistantButton } from '@/components/studio/AskAssistantButton'
import { StudioHeader } from '@/components/studio/StudioHeader'

export const metadata = { title: 'Help & support' }

const FAQ: [string, string][] = [
  ['How are my analyses created?', 'Our AI combines your answers with current market knowledge to build each analysis. Programs and learning links only come from Learnbay’s published catalog and checked resources.'],
  ['Why can’t I change my answers?', 'Each analysis is built once from your answers so it stays consistent. If something is wrong, book a counselling session and we will correct it with you.'],
  ['Are the salary numbers guaranteed?', 'No. They are indicative market ranges for your experience and city. Your actual offers depend on company, interviews and negotiation.'],
  ['Who can see my results?', 'Only you, after logging in with your email code. If you create a share link, anyone with the link can see that analysis, never your email, phone or current salary. You can turn the link off any time.'],
  ['How do I log in again?', 'Use Login on the home page with the same email. We send a 6-digit code, so no password needed.'],
  ['How do I talk to a person?', 'Book a Career Strategy Session with a date and time that suits you. A Learnbay mentor or counsellor will connect with you.'],
]

export default function HelpPage() {
  return (
    <>
      <StudioHeader title="Help & support" subtitle="Answers to common questions about your Career Studio." />
      <section className="card faq">
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="message" className="text-primary" /> Still stuck?</h2>
          <p className="small muted">Ask Career AI. It can also take you to the right page.</p>
          <AskAssistantButton />
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="calendar" className="text-primary" /> Prefer a person?</h2>
          <p className="small muted">Book a free session at a time that suits you.</p>
          <Link href="/dashboard/sessions" className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>Book a session</Link>
        </section>
      </div>
    </>
  )
}
