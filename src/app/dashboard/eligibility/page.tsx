import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { ProofStrip } from '@/components/ProofStrip'
import { EligibilityTest } from '@/components/eligibility/EligibilityTest'
import { UspNote } from '@/components/usp/UspNote'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { programsForInterest } from '@/config/programs'
import { getStudio } from '@/lib/data'
import { getTestState, prepareNextAttempt, rulesOf, trackFor } from '@/lib/eligibility'
import { activeSetFor } from '@/lib/eligibility-sets'
import { INTERESTS, labelOf } from '@/lib/questions'

export const metadata = { title: 'Eligibility Test' }

export default async function EligibilityPage() {
  const { user, answers } = await getStudio()
  const [state, set] = await Promise.all([getTestState(user.id), activeSetFor(answers.interest)])
  const rules = rulesOf(set)
  const trackLabel = labelOf(INTERESTS, trackFor(answers.interest)) ?? 'AI & GenAI'
  const program = programsForInterest(answers.interest)[0]
  // Get the next set of questions ready while the learner reads the instructions.
  if (set && state.status !== 'in_progress' && state.attempts.left > 0) prepareNextAttempt(user.id, answers)
  const minutes = Math.max(1, Math.round(rules.sessionSeconds / 60))

  // The admin has paused the test (globally, or every set for this program area) and there is no result to show.
  if (!set && state.status === 'not_started') {
    return (
      <>
        <StudioHeader title="Eligibility Test" subtitle="Check your readiness for a program." />
        <section className="card stack" style={{ alignItems: 'flex-start' }}>
          <span className="fc-icon"><Icon name="clock" /></span>
          <h2 className="card-title">The eligibility test is not available right now</h2>
          <p className="muted">A counsellor can check your readiness with you on a free 1:1 call instead.</p>
          <Link href="/dashboard/sessions" className="btn btn-primary">Book a free 1:1 call</Link>
        </section>
        <ProofStrip />
      </>
    )
  }

  return (
    <>
      <StudioHeader title="Eligibility Test" subtitle={`See if you are ready for a ${trackLabel} program, in about ${minutes} minute${minutes === 1 ? '' : 's'}.`} />
      <EligibilityTest
        initial={state}
        rules={rules}
        trackLabel={trackLabel}
        needs={{ eduLevel: !answers.eduLevel, mathComfort: !answers.mathComfort }}
        programName={program.name}
      />
      {state.status !== 'in_progress' && (
        <div className="grid-2">
          <UspNote usp="customisation" lead="Your score is a starting point, not a gate." />
          <UspNote usp="mentors" lead="Whatever your result, you won't be learning alone." />
        </div>
      )}
      {state.status !== 'in_progress' && <ProofStrip />}
    </>
  )
}
