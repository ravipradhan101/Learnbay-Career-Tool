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
  const skills = !answers.skills?.length ? '—' : answers.skills.includes(SKILL_NONE) ? 'None yet' : answers.skills.map((s) => labelOf(SKILLS, s)).join(', ')
  const rows: [string, string][] = [
    ['Name', user.name ?? '—'],
    ['Email', user.email],
    ['Phone', user.phone ? `${flag} ${user.phone_country} ${user.phone}` : '—'],
    ['Current role', roleLabel(answers)],
    ['Experience', experienceLabel(answers)],
    ['Codes at work', labelOf(PROGRAMMER, answers.programmer) ?? '—'],
    ['Program area', interestLabel(answers)],
    ['Target role', answers.targetRole ? targetRoleLabel(answers) : '—'],
    ['Skills', skills],
    ['Current CTC', labelOf(CTC_BANDS, answers.ctc) ?? '—'],
    ['City', labelOf(CITIES, answers.city) ?? '—'],
    ['Weekly learning time', labelOf(WEEKLY_HOURS, answers.weeklyHours) ?? '—'],
    ['Timeline', labelOf(TIMELINES, answers.timeline) ?? '—'],
  ]
  return (
    <>
      <StudioHeader title="My profile" subtitle="The answers your analyses are built on." />
      <section className="card">
        <dl style={{ margin: 0, display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="xsmall muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</dt>
              <dd style={{ margin: '0.125rem 0 0', fontWeight: 600, overflowWrap: 'anywhere' }}>{v}</dd>
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
