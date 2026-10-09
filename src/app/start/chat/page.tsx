import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GuestChat } from '@/components/chat/GuestChat'
import { Logo } from '@/components/Logo'
import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { TRACKS } from '@/lib/questions'

export const metadata: Metadata = { title: 'Talk to Bruce, your guide' }

/** Step 3: Bruce, the guide. ?track=ai|fde|cloud-devops, or ?login=1 for returning learners. */
export default async function StartChatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const login = params.login === '1'
  const track = TRACKS.find((t) => t.id === params.track)?.interest ?? null
  const user = await getCurrentUser()
  const answers = user ? await getAnswers(user.id) : null
  if (user && answers?.interest && user.phone) redirect(track ? `/dashboard?track=${track}` : '/dashboard')
  if (!login && !track && !answers?.interest) redirect('/start')
  return (
    <div className="tg-page">
      <header className="tg-top">
        <div className="tg-wrap tg-top-in">
          <Logo />
          {!login && <Link href="/start" className="tg-login">Change track</Link>}
        </div>
      </header>
      <main className="tg-main tg-wrap tg-solo">
        <GuestChat
          signedIn={user ? { name: user.name ?? '', email: user.email, phoneCountry: user.phone_country ?? '+91', phone: user.phone ?? '' } : null}
          initial={answers ?? {}}
          track={track}
          mode={login ? 'login' : 'start'}
        />
      </main>
    </div>
  )
}
