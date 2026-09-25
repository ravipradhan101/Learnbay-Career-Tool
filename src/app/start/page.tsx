import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { Onboarding } from '@/components/Onboarding'
import { ProofStrip } from '@/components/ProofStrip'
import { Testimonials } from '@/components/Testimonials'
import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { getTool } from '@/lib/tools-meta'

export const metadata: Metadata = {
  title: 'Start your free AI career analysis',
  description: 'Answer 4 quick questions and open your personal Career Studio: skill gaps, salary benchmark and a roadmap built for you.',
}

export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const toolParam = typeof params.tool === 'string' ? params.tool : ''
  const next = toolParam === 'sessions' || getTool(toolParam) ? toolParam : ''
  const user = await getCurrentUser()
  const answers = user ? await getAnswers(user.id) : null
  if (user && answers?.interest && user.phone) {
    redirect(next === 'sessions' ? '/dashboard/sessions' : getTool(next)?.route ?? '/dashboard')
  }

  return (
    <>
      <SiteHeader />
      <main className="onboard-page">
        <div className="container">
          <Onboarding
            next={next}
            signedIn={user ? { email: user.email, name: user.name ?? '', phoneCountry: user.phone_country ?? '+91', phone: user.phone ?? '' } : null}
            initial={answers ?? {}}
          />
          <div className="onboard-proof stack" style={{ gap: '1.5rem' }}>
            <ProofStrip />
            <Testimonials />
          </div>
        </div>
      </main>
    </>
  )
}
