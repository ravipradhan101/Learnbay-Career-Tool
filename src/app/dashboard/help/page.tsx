import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/chat/Sheet'

export const metadata = { title: 'Help & support' }

const FAQ: [string, string][] = [
  ['How are my reports created?', 'Your career counsellor combines your answers with current market knowledge to build each analysis. Programs and learning links only come from Learnbay’s published catalog and checked resources.'],
  ['Why can’t I change my answers?', 'Each analysis is built once from your answers so it stays consistent. If something is wrong, book a counselling session and we will correct it with you.'],
  ['Are the salary numbers guaranteed?', 'No. They are indicative market ranges for your experience and city. Your actual offers depend on company, interviews and negotiation.'],
  ['Who can see my results?', 'Only you, after logging in with your email code. If you create a share link, anyone with the link can see that analysis — never your email, phone or current salary. You can turn the link off any time.'],
  ['How do I log in again?', 'Use Login on the home page with the same email. We send a 6-digit code — no password needed.'],
  ['Are Richa and the counsellors in the chat real people?', 'They are Learnbay’s virtual career guide and virtual counsellors: they reply instantly, any time, using your answers and Learnbay’s published programs. To talk to a person, tap the phone icon or book a free 1:1 and a Learnbay mentor will connect with you.'],
  ['How do I talk to a person?', 'Choose “Talk to a mentor” in the left panel and pick a date and time. A Learnbay mentor or counsellor will connect with you.'],
]

export default function HelpPage() {
  return (
    <Sheet title="Help & support" closeHref="/dashboard">
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
          <p className="small muted">Ask your counsellor in the chat. They can also take you to the right place.</p>
          <Link href="/dashboard" scroll={false} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Back to the chat</Link>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="calendar" className="text-primary" /> Prefer a person?</h2>
          <p className="small muted">Book a free session at a time that suits you.</p>
          <Link href="/dashboard/sessions" scroll={false} className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>Book a session</Link>
        </section>
      </div>
    </Sheet>
  )
}
