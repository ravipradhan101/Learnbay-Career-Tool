import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { EngagementPopup } from '@/components/EngagementPopup'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { PARTNERS } from '@/config/partners'
import { PROGRAMS } from '@/config/programs'
import { getCurrentUser } from '@/lib/auth'
import { getLatestSession } from '@/lib/data'

/* What the check actually hands back. Each one is a real section of the
   generated report, not a promise we would then have to keep by hand:
   the readiness score and skill map come out of Skill Gap Analysis, the
   pay ranges out of Salary Benchmark, the plan out of Career Roadmap. */
const DELIVERABLES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'target', title: 'Readiness score', text: 'Where you stand for your target role' },
  { icon: 'chart', title: 'Skill-gap map', text: 'What to learn first, and what to skip' },
  { icon: 'rupee', title: 'Salary benchmark', text: 'What your next role could pay' },
  { icon: 'route', title: 'Personal roadmap', text: 'Month by month, paced to your time' },
]

export default async function HomePage() {
  const user = await getCurrentUser()
  const hasSession = user ? Boolean(await getLatestSession(user.id)) : false
  return (
    <>
      {/* No start button in the header: the card below owns the only way in,
          and two competing calls to action would just split the decision. */}
      <SiteHeader showStart={false} />
      <main className="landing">
        <section className="hero">
          <div className="container">
            {/* One object, laid out sideways. Stacked, this page needs about
                790px of height, which is more than a laptop at 150% zoom has
                to give; side by side it needs a little over half that. */}
            <div className="entry-card">
              <div className="entry-main">
                <span className="entry-eyebrow"><Icon name="sparkles" size="0.75rem" /> Career readiness · 2026</span>
                <h1>Your next tech role,<span className="gradient-text">planned with a counsellor.</span></h1>
                <p className="entry-sub">
                  Pick your track, talk to a Learnbay career counsellor and get a clear, personal plan for AI, FDE or Cloud &amp; DevOps roles.
                </p>
                {/* Two facts, not three: what you receive is the panel
                    alongside, in full, so repeating it here would be noise. */}
                <dl className="entry-spec">
                  <div>
                    <dt><Icon name="users" size="0.6875rem" /> Best for</dt>
                    <dd>Working professionals &amp; graduates</dd>
                  </div>
                  <div>
                    <dt><Icon name="clock" size="0.6875rem" /> Time needed</dt>
                    <dd>About 2 minutes</dd>
                  </div>
                </dl>
                <Link href={user ? '/dashboard' : '/start'} className="btn btn-primary entry-cta">
                  {user ? 'Open my Career Studio' : 'Start my free career check'}
                  <Icon name="arrowRight" size="1rem" />
                </Link>
                <p className="entry-note">Private responses · Free · No spam</p>
              </div>

              {/* The promise sits next to the button that makes it. */}
              <div className="entry-gets">
                <p className="entry-gets-label">What you receive</p>
                <ul>
                  {DELIVERABLES.map((d) => (
                    <li key={d.title}>
                      <span className="entry-gets-icon"><Icon name={d.icon} size="0.9375rem" /></span>
                      <span>
                        <b>{d.title}</b>
                        <span>{d.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="entry-partners">
                <p className="hero-partners-label">Certifications &amp; partners</p>
                <ul className="partner-logos">
                  {PARTNERS.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <li key={p.name}><img src={p.logo} alt={p.name} height={28} /></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      {/* Career AI and the call button live inside the Studio, after sign-up; the landing page only has the exit prompt. */}
      <EngagementPopup signedIn={Boolean(user)} hasSession={hasSession} program={{ name: PROGRAMS[0].name, url: PROGRAMS[0].url }} />
    </>
  )
}
