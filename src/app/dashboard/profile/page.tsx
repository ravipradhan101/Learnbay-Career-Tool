import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { getStudio } from '@/lib/data'
import {
  CITIES, COUNTRY_CODES, CTC_BANDS, PROGRAMMER, SKILLS, SKILL_NONE, TIMELINES, WEEKLY_HOURS,
  experienceLabel, interestLabel, labelOf, roleLabel, targetRoleLabel,
} from '@/lib/questions'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const { user, answers } = await getStudio()
  const flag = COUNTRY_CODES.find((c) => c.code === user.phone_country)?.flag ?? ''
  const skills = !answers.skills?.length ? 'Not set' : answers.skills.includes(SKILL_NONE) ? 'None yet' : answers.skills.map((s) => labelOf(SKILLS, s)).join(', ')
  const rows: [string, string][] = [
    ['Name', user.name ?? 'Not set'],
    ['Email', user.email],
    ['Phone', user.phone ? `${flag} ${user.phone_country} ${user.phone}` : 'Not set'],
    ['Current role', roleLabel(answers)],
    ['Experience', experienceLabel(answers)],
    ['Codes at work', labelOf(PROGRAMMER, answers.programmer) ?? 'Not set'],
    ['Program area', interestLabel(answers)],
    ['Target role', answers.targetRole ? targetRoleLabel(answers) : 'Not set'],
    ['Skills', skills],
    ['Current CTC', labelOf(CTC_BANDS, answers.ctc) ?? 'Not set'],
    ['City', labelOf(CITIES, answers.city) ?? 'Not set'],
    ['Weekly learning time', labelOf(WEEKLY_HOURS, answers.weeklyHours) ?? 'Not set'],
    ['Timeline', labelOf(TIMELINES, answers.timeline) ?? 'Not set'],
  ]
  return (
    <>
      <StudioHeader title="My profile" subtitle="The answers your analyses are built on." />
      <section className="card">
        <dl style={{ margin: 0, display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="small muted">{k}</dt>
              <dd style={{ margin: '0.25rem 0 0', fontWeight: 500, overflowWrap: 'anywhere' }}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="card row between">
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Icon name="lock" className="text-primary" />
          <div>
            <b>Your answers are locked</b>
            <p className="small muted">Each analysis is personalised to these answers. Need a correction? A mentor can update it with you in a 1:1 session.</p>
          </div>
        </div>
        <Link href="/dashboard/sessions" className="btn btn-outline btn-sm">Book a 1:1 session</Link>
      </section>
    </>
  )
}
