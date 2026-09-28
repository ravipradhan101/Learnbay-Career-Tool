import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Empty, Stat, fmtDate, fmtInr, fmtInt, fmtTokens } from '@/components/admin/parts'
import { STEP_NAMES, featureName, pageName, userJourney } from '@/lib/admin-reports'
import { experienceLabel, interestLabel, roleLabel, type Answers } from '@/lib/questions'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata = { title: 'Learner journey' }

type Ev = { type: string; name: string | null; path: string; props: Record<string, unknown>; created_at: Date; session_id: string | null; signed_in: boolean }

const ACTIONS: Record<string, string> = {
  onboarding_completed: 'Submitted contact details (signed up)', onboarding_existing_email: 'Used an email that already had an account',
  login_completed: 'Logged in', contact_field_focus: 'Clicked into a contact field', first_pick: 'Chose what to check first',
  first_pick_dismissed: 'Closed the “what to check first” pop-up', tool_generate_start: 'Started generating a report', tool_ready: 'Saw a finished report',
  assistant_message: 'Asked the AI advisor', session_booked: 'Booked a 1:1 session', report_emailed: 'Emailed a report to self',
  share_created: 'Created a share link', exit_popup_shown: 'Saw the exit pop-up', exit_popup_action: 'Acted on the exit pop-up',
  masterclass_interest: 'Registered interest in a masterclass', program_click: 'Clicked a program', brochure_click: 'Clicked a brochure',
  call_sheet_open: 'Opened the call options', resource_click: 'Opened a learning resource',
}

function stepLabel(name: string | null) {
  const [scope, key] = (name ?? '').split(':')
  const where = scope === 'onboarding' ? 'Quick start' : scope === 'login' ? 'Login' : scope === 'first_pick' ? 'Pop-up' : featureName(scope)
  return `${where}: ${STEP_NAMES[key] ?? key ?? ''}`
}

function describe(e: Ev): { what: string; detail: string } {
  const p = e.props ?? {}
  const extra = (k: string) => (p[k] === undefined ? '' : String(p[k]))
  switch (e.type) {
    case 'page_view': return { what: 'Opened page', detail: pageName(e.path) }
    case 'page_leave': return { what: extra('exit') ? 'Left the site' : 'Left page', detail: `${pageName(e.path)} after ${Math.round(Number(p.duration_ms ?? 0) / 1000)}s, scrolled ${extra('scroll_pct') || 0}%` }
    case 'click': return { what: 'Clicked', detail: `“${e.name ?? ''}”${extra('href') ? ` → ${pageName(extra('href'))}` : ''}` }
    case 'step_view': return { what: 'Saw question', detail: stepLabel(e.name) }
    case 'step_answer': return { what: 'Answered', detail: `${stepLabel(e.name)} = ${extra('value')}` }
    case 'step_back': return { what: 'Went back from', detail: stepLabel(e.name) }
    case 'error': return { what: 'Hit an error', detail: `${e.name ?? ''}${extra('status') ? ` (HTTP ${extra('status')})` : ''}` }
    default: {
      const bits = Object.entries(p).filter(([k]) => k !== 'turn').map(([k, v]) => `${k}: ${String(v)}`).join(', ')
      return { what: ACTIONS[e.name ?? ''] ?? e.name ?? 'Action', detail: bits }
    }
  }
}

export default async function UserJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const data = await userJourney((await params).id)
  if (!data) notFound()
  const { user, events, tools, tokens, sessions } = data
  const a = (user.answers ?? {}) as Answers
  const totalTokens = tokens.reduce((s, t) => s + t.total, 0)
  const totalCost = tokens.reduce((s, t) => s + t.costInr, 0)

  // Group events into visits, newest first (events are already sorted newest first).
  const visits: { id: string; events: Ev[] }[] = []
  for (const e of events as Ev[]) {
    const id = e.session_id ?? 'unknown'
    const last = visits[visits.length - 1]
    if (last && last.id === id) last.events.push(e)
    else visits.push({ id, events: [e] })
  }

  return (
    <>
      <div className="row between">
        <div>
          <p className="small"><Link href="/admin/leads">← Leads</Link></p>
          <h1 className="admin-h1">{user.name || user.email}</h1>
          <p className="muted small">{user.email}{user.phone ? ` · ${user.phone_country ?? ''} ${user.phone}` : ''} · signed up {fmtDate(user.created_at)} · last login {fmtDate(user.last_login_at)}</p>
        </div>
      </div>
      <div className="stat-grid">
        <Stat label="Profile" value={user.answers ? roleLabel(a) : 'None'} note={user.answers ? `${experienceLabel(a)} · ${interestLabel(a)}` : undefined} />
        <Stat label="Tools" value={`${tools.filter((t) => t.status === 'ready').length} / 3 ready`} note={tools.map((t) => `${featureName(t.tool)}: ${t.status}`).join(' · ') || 'none started'} />
        <Stat label="AI tokens" value={fmtTokens(totalTokens)} note={`≈${fmtInr(totalCost)}`} />
        <Stat label="1:1 session" value={sessions.length ? 'Booked' : 'Not booked'} note={sessions[0] ? `${sessions[0].preferred_date ?? ''} ${sessions[0].preferred_time ?? ''}` : undefined} />
      </div>

      {tools.some((t) => t.status === 'ready') && (
        <section className="card stack">
          <h2 className="card-title">Reports this learner received</h2>
          <div className="row">
            {tools.filter((t) => t.status === 'ready').map((t) => (
              <a key={t.tool} className="btn btn-outline btn-sm" href={`/api/admin/users/${user.id}/report/${t.tool}`} target="_blank" rel="noopener noreferrer">{featureName(t.tool)} (PDF)</a>
            ))}
          </div>
        </section>
      )}

      {tokens.length > 0 && (
        <section className="card stack">
          <h2 className="card-title">AI usage for this learner</h2>
          <table className="admin-table compact">
            <thead><tr><th>Feature</th><th className="num">Calls</th><th className="num">Tokens</th><th className="num">Est. cost</th></tr></thead>
            <tbody>{tokens.map((t) => <tr key={t.feature}><td>{featureName(t.feature)}</td><td className="num">{fmtInt(t.calls)}</td><td className="num">{fmtInt(t.total)}</td><td className="num">{fmtInr(t.costInr)}</td></tr>)}</tbody>
          </table>
        </section>
      )}

      <section className="card stack">
        <div>
          <h2 className="card-title">Journey, newest first</h2>
          <p className="card-sub">Includes what they did on the same browser before signing up. Last 500 events.</p>
        </div>
        {visits.length ? (
          <ul className="ev-timeline">
            {visits.map((v, i) => (
              <Fragment key={`${v.id}-${i}`}>
                <li className="visit">Visit on {fmtDate(v.events[v.events.length - 1].created_at)} · {v.events.length} events{v.events.every((e) => !e.signed_in) ? ' · before sign-up or logged out' : ''}</li>
                {v.events.map((e, j) => {
                  const d = describe(e)
                  return (
                    <li key={j}>
                      <span className="muted">{new Date(e.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span><span className="ev-type">{d.what}</span> {d.detail && <span className="muted">{d.detail}</span>}</span>
                    </li>
                  )
                })}
              </Fragment>
            ))}
          </ul>
        ) : <Empty>No activity recorded for this learner yet (tracking started with this release).</Empty>}
      </section>
    </>
  )
}
