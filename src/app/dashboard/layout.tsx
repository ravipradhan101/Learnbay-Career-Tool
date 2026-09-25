import type { Metadata } from 'next'
import { StudioShell } from '@/components/studio/StudioShell'
import { SiteWidgets } from '@/components/SiteWidgets'
import { programsForInterest } from '@/config/programs'
import { getStudio } from '@/lib/data'
import { activeSetFor } from '@/lib/eligibility-sets'
import { WhyLearnbay } from '@/components/why/WhyLearnbay'
import { interestLabel, roleLabel } from '@/lib/questions'

export const metadata: Metadata = { title: 'Career Studio', robots: { index: false, follow: false } }

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, answers, tools, hasSession } = await getStudio()
  const eligibilityVisible = Boolean(await activeSetFor(answers.interest))
  const program = programsForInterest(answers.interest)[0]
  const status = Object.fromEntries(tools.map((t) => [t.tool, t.status]))
  return (
    <StudioShell name={user.name ?? user.email} email={user.email} toolStatus={status} eligibilityVisible={eligibilityVisible}>
      {children}
      <SiteWidgets signedIn hasSession={hasSession} program={{ name: program.name, url: program.url }} />
      <WhyLearnbay profile={{ role: roleLabel(answers), interest: interestLabel(answers), city: answers.city ?? null, program: { name: program.name, url: program.url, features: program.features } }} />
    </StudioShell>
  )
}
