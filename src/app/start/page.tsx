import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Icon } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { ResetGuestChat } from '@/components/ResetGuestChat'
import { programFor } from '@/config/programs'
import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { TRACKS } from '@/lib/questions'

export const metadata: Metadata = { title: 'Choose your track' }

/** Step 2: pick a track. Each card says who it is for, the roles it leads to and the program behind it. */
export default async function StartPage() {
  const user = await getCurrentUser()
  const answers = user ? await getAnswers(user.id) : null
  if (user && answers?.interest && user.phone) redirect('/dashboard')
  return (
    <div className="lp">
      <ResetGuestChat />
      <header className="lp-top">
        <Logo />
        <Link href="/start/chat?login=1" className="lp-login">Log in</Link>
      </header>
      <main className="lp-main lp-tracks-main">
        <div className="lp-head">
          <span className="lp-step">Step 1 of 2</span>
          <h1>Choose your track</h1>
          <p>Pick the direction you’re most interested in. Your counsellor will confirm the right fit with you.</p>
        </div>
        <div className="lp-tracks">
          {TRACKS.map((t) => {
            const program = programFor(t.interest)
            return (
              <Link key={t.id} href={`/start/chat?track=${t.id}`} className="lp-track">
                <span className="lp-track-icon"><Icon name={t.icon} size="1.25rem" /></span>
                <div className="lp-track-title">
                  <b>{t.label}</b>
                  <small>{t.hint}</small>
                </div>
                <dl>
                  <div><dt>Best for</dt><dd>{t.bestFor}</dd></div>
                  <div><dt>Roles you can target</dt><dd>{t.roles.join(' · ')}</dd></div>
                  {program && <div><dt>Program</dt><dd>{program.name}</dd></div>}
                </dl>
                <span className="lp-track-go">Choose this track <Icon name="arrowRight" size="0.95rem" /></span>
              </Link>
            )
          })}
        </div>
        <p className="lp-fine">Not sure? Pick the closest one; your counsellor will help you decide.</p>
      </main>
    </div>
  )
}
