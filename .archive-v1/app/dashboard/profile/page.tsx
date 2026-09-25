import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { getReadyDashboard } from '@/lib/data'
import {
  CHALLENGES, CHALLENGE_OTHERS, COUNTRY_CODES, CTC_BANDS, GOALS, SITUATIONS, SKILLS, SKILL_NONE, SKILL_OTHERS, WEEKLY_HOURS,
  experienceLabel, industryLabel, labelOf, roleLabel,
} from '@/lib/questions'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const { user, answers } = await getReadyDashboard()
  const skills = answers.skills.includes(SKILL_NONE)
    ? ['None yet']
    : [...answers.skills.filter((s) => s !== SKILL_OTHERS).map((s) => labelOf(SKILLS, s) ?? s), ...(answers.skillsOther ? [answers.skillsOther] : [])]
  const challenges = [
    ...answers.challenges.filter((c) => c !== CHALLENGE_OTHERS).map((c) => labelOf(CHALLENGES, c) ?? c),
    ...(answers.challengesOther ? [answers.challengesOther] : []),
  ]
  const flag = COUNTRY_CODES.find((c) => c.code === user.phone_country)?.flag ?? ''
  const rows: [string, React.ReactNode][] = [
    ['Name', user.name],
    ['Email', user.email],
    ['Phone', user.phone ? `${flag} ${user.phone_country} ${user.phone}` : '—'],
    ['Current situation', labelOf(SITUATIONS, answers.situation) ?? '—'],
    ['Current role', roleLabel(answers)],
    ['Experience', experienceLabel(answers)],
    ['Industry / Domain', industryLabel(answers)],
    ['Current annual CTC', labelOf(CTC_BANDS, answers.ctc) ?? 'Not shared'],
    ['Weekly learning time', labelOf(WEEKLY_HOURS, answers.weeklyHours) ?? '—'],
  ]
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Profile</h1>
          <p>The answers your report is built on.</p>
        </div>
      </div>
      <section className="card">
        <dl style={{ margin: 0, display: 'grid', gap: '0.875rem' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gap: '0.125rem' }}>
              <dt className="xsmall muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title">Skills & tools</h2>
          <div className="tag-list">{skills.length ? skills.map((s) => <span className="pill primary" key={s}>{s}</span>) : <span className="muted">Not specified</span>}</div>
          <h2 className="card-title">Goals (next 1-2 years)</h2>
          <div className="tag-list">{answers.goals.length ? answers.goals.map((g) => <span className="pill primary" key={g}>{labelOf(GOALS, g)}</span>) : <span className="muted">Not specified</span>}</div>
        </section>
        <section className="card stack">
          <h2 className="card-title">Challenges</h2>
          <div className="tag-list">{challenges.length ? challenges.map((c) => <span className="pill" key={c}>{c}</span>) : <span className="muted">Not specified</span>}</div>
        </section>
      </div>
      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Icon name="lock" className="text-primary" />
          <div>
            <b>Your profile is locked</b>
            <p className="small muted">Your report is personalized to these answers. Need to correct something? A career counselor can update it for you.</p>
          </div>
        </div>
        <Link href="/dashboard/counselor" className="btn btn-outline btn-sm">Talk to a Counselor</Link>
      </section>
    </>
  )
}
