import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { EngagementPopup } from '@/components/EngagementPopup'
import { Icon } from '@/components/Icon'
import { LoginForm } from '@/components/LoginForm'
import { Testimonials } from '@/components/Testimonials'
import { PROGRAMS } from '@/config/programs'
import { PROOF_POINTS } from '@/config/testimonials'
import { getCurrentUser } from '@/lib/auth'
import { getLatestSession } from '@/lib/data'
import { TOOLS } from '@/lib/tools-meta'

export default async function HomePage() {
  const user = await getCurrentUser()
  const hasSession = user ? Boolean(await getLatestSession(user.id)) : false
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="hero-pill"><Icon name="sparkles" size="0.9rem" /> Free AI career studio by Learnbay</span>
              <h1>Your career, with a <span className="gradient-text">clear next step.</span></h1>
              <p className="hero-sub">See your skill gaps, what your next role pays, and a roadmap built for you — in about 2 minutes.</p>
              <ul className="tool-chips" aria-label="What you get">
                {TOOLS.map((t) => <li key={t.id}><Icon name={t.icon} size="1rem" />{t.name}</li>)}
              </ul>
              <div className="hero-cta">
                <Link href={user ? '/dashboard' : '/start'} className="btn btn-primary btn-lg">
                  {user ? 'Open my Career Studio' : 'Start My Free Analysis'} <Icon name="arrowRight" size="1.1rem" />
                </Link>
                <p className="hero-meta">4 quick questions · about 2 minutes · free</p>
              </div>
            </div>
            {!user && <LoginForm compact />}
          </div>
        </section>

        <section className="section-tight" id="stories">
          <div className="container stack" style={{ gap: '1.75rem' }}>
            <Testimonials />
            <ul className="proof-line" aria-label="Why Learnbay">
              {PROOF_POINTS.map((p) => <li key={p.title}><Icon name={p.icon} size="1.1rem" />{p.title}</li>)}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
      {/* Career AI and the call button live inside the Studio, after sign-up; the landing page only has the exit prompt. */}
      <EngagementPopup signedIn={Boolean(user)} hasSession={hasSession} program={{ name: PROGRAMS[0].name, url: PROGRAMS[0].url }} />
    </>
  )
}
