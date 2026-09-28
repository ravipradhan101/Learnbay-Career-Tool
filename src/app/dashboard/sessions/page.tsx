import { Icon } from '@/components/Icon'
import { ProofStrip } from '@/components/ProofStrip'
import { Testimonials } from '@/components/Testimonials'
import { SessionBooking } from '@/components/studio/SessionBooking'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { getSessions, getStudio } from '@/lib/data'
import { SESSION_NAME, sessionTypeLabel } from '@/lib/sessions'

export const metadata = { title: 'Career Strategy Sessions' }

export default async function SessionsPage() {
  const { user } = await getStudio()
  const sessions = await getSessions(user.id)
  const phone = user.phone ? `${user.phone_country ?? ''} ${user.phone}`.trim() : ''
  return (
    <>
      <StudioHeader title="Career Strategy Sessions" subtitle={`Book a free ${SESSION_NAME} session with a Learnbay mentor.`} />
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <SessionBooking phone={phone} />
        <div className="stack">
          <section className="card stack session-aside">
            <h2 className="card-title"><Icon name="users" className="text-primary" /> What you get</h2>
            <ul className="list-check">
              {['Your results reviewed with an expert', 'The right program for your background', 'Clear answers on fees, EMI and batch timings', 'A plan that fits your work schedule'].map((t) => (
                <li key={t}><Icon name="checkCircle" size="1.1rem" />{t}</li>
              ))}
            </ul>
          </section>
          {sessions.length > 0 && (
            <section className="card stack">
              <h2 className="card-title"><Icon name="calendar" className="text-primary" /> Your requests</h2>
              <ul className="list-check">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Icon name="clock" size="1.1rem" />
                    <span>
                      <b>{sessionTypeLabel(s.session_type)}</b>{' '}
                      {s.preferred_date ? new Date(`${s.preferred_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Any day'}
                      {s.preferred_time ? ` at ${s.preferred_time}` : ''}
                      <span className="pill" style={{ marginLeft: '0.5rem' }}>{s.status === 'new' ? 'Awaiting confirmation' : s.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      <Testimonials />
      <ProofStrip />
    </>
  )
}
