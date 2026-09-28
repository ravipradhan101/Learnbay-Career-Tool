import Link from 'next/link'
import { Icon, type IconName } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { ResetGuestChat } from '@/components/ResetGuestChat'
import { PartnerLogos } from '@/components/PartnerLogos'
import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'

// The landing page: one clean card that says what the learner gets, and one button.

const GETS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'target', title: 'Readiness score', text: 'Where you stand for your target role' },
  { icon: 'chart', title: 'Skill-gap map', text: 'What to learn first, and what to skip' },
  { icon: 'rupee', title: 'Salary benchmark', text: 'What your next role could pay' },
  { icon: 'route', title: 'Personal roadmap', text: 'Month by month, paced to your time' },
]

export default async function HomePage() {
  const user = await getCurrentUser()
  const answers = user ? await getAnswers(user.id) : null
  const inStudio = Boolean(user && answers?.interest && user.phone)
  return (
    <div className="lp">
      <ResetGuestChat />
      <header className="lp-top">
        <Logo />
        <Link href={inStudio ? '/dashboard' : '/start/chat?login=1'} className="lp-login">{inStudio ? 'Open my studio' : 'Log in'}</Link>
      </header>

      <main className="lp-main">
        <section className="lp-card">
          <span className="lp-badge"><Icon name="sparkles" size="0.8rem" /> Career readiness · 2026</span>
          <h1>Your next tech role,<br /><span>planned with a counsellor.</span></h1>
          <p className="lp-sub">Pick your track, talk to a Learnbay career counsellor and get a clear, personal plan for AI, FDE or Cloud &amp; DevOps roles.</p>

          <dl className="lp-facts">
            <div><dt>Best for</dt><dd>Working professionals &amp; graduates</dd></div>
            <div><dt>Time needed</dt><dd>About 5 minutes</dd></div>
            <div><dt>You receive</dt><dd>Readiness report + 1:1 guidance</dd></div>
          </dl>

          <Link href={inStudio ? '/dashboard' : '/start'} className="lp-cta">
            {inStudio ? 'Continue to my studio' : 'Start my free career check'} <Icon name="arrowRight" size="1.1rem" />
          </Link>
          <p className="lp-fine">Private responses · Free · No spam</p>
        </section>

        <section className="lp-gets" aria-label="What you get">
          {GETS.map((g) => (
            <div key={g.title} className="lp-get">
              <span className="lp-get-icon"><Icon name={g.icon} size="1.05rem" /></span>
              <b>{g.title}</b>
              <small>{g.text}</small>
            </div>
          ))}
        </section>

        <section className="lp-partners" aria-label="Certifications and partners">
          <span>Certifications &amp; partners</span>
          <PartnerLogos size={24} />
        </section>
      </main>
    </div>
  )
}
