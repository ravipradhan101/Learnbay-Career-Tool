'use client'

import { useState } from 'react'
import { Msg, useAction } from './useAction'

type Opt = { id: string; label: string }
export type MeetingItem = {
  id: string; host: string; mode: string; kind: string; starts_at: string; ends_at: string; meet_url: string | null; status: string
  requested_by: string; note: string | null; cancel_reason: string | null
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const STATUS: Record<string, string> = { scheduled: 'Scheduled', completed: 'Held', no_show: 'No-show', cancelled: 'Cancelled' }

function MeetingRow({ leadId, m }: { leadId: string; m: MeetingItem }) {
  const [link, setLink] = useState('')
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  const upcoming = m.status === 'scheduled' && new Date(m.ends_at).getTime() > Date.now()
  return (
    <li className="crm-meeting">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <b>{m.mode === 'video' ? '🎥 Google Meet' : '📞 Phone call'} · {when(m.starts_at)}</b>
          <div className="small muted">
            Host {m.host} · {m.requested_by === 'user' ? (m.kind === 'instant' ? 'learner asked to connect now' : 'booked by the learner') : 'booked by the team'}
            {m.note && <> · “{m.note}”</>}{m.cancel_reason && <> · {m.cancel_reason}</>}
          </div>
        </div>
        <span className={`pill ${m.status === 'scheduled' ? 'primary' : m.status === 'completed' ? 'success' : m.status === 'cancelled' ? '' : 'danger'}`}>{STATUS[m.status] ?? m.status}</span>
      </div>
      {upcoming && (
        <div className="row" style={{ gap: '0.4rem', marginTop: '0.4rem' }}>
          {m.meet_url && <a className="btn btn-primary btn-sm" href={m.meet_url} target="_blank" rel="noopener noreferrer">Join Google Meet</a>}
          {m.mode === 'video' && !m.meet_url && (
            <form className="row" style={{ gap: '0.4rem' }} onSubmit={(e) => { e.preventDefault(); void run({ action: 'meeting-link', meetingId: m.id, url: link }) }}>
              <input className="input" style={{ minWidth: '16rem' }} placeholder="https://meet.google.com/abc-defg-hij" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Google Meet link" />
              <button className="btn btn-soft btn-sm" disabled={busy || !link}>Send link</button>
            </form>
          )}
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
            onClick={() => { const reason = window.prompt('Cancel this meeting? The learner and host are emailed. Reason (optional):'); if (reason !== null) void run({ action: 'meeting-cancel', meetingId: m.id, reason }) }}>
            Cancel
          </button>
        </div>
      )}
      <Msg msg={msg} />
    </li>
  )
}

/** Meetings with this lead, and booking a new one (video on Google Meet, or phone) without clashing with the host's calendar. */
export function MeetingPanel({ leadId, meetings, hosts, meId }: { leadId: string; meetings: MeetingItem[]; hosts: Opt[]; meId: string }) {
  const [f, setF] = useState({ mode: 'video', hostId: meId, startsAt: '', minutes: '30', note: '' })
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  return (
    <div className="stack" style={{ gap: '0.75rem' }}>
      {meetings.length > 0 && <ul className="crm-list">{meetings.map((m) => <MeetingRow key={m.id} leadId={leadId} m={m} />)}</ul>}
      <form className="crm-meet-form" onSubmit={async (e) => {
        e.preventDefault()
        const r = await run({ action: 'meeting', ...f, startsAt: new Date(f.startsAt).toISOString() })
        if (r.ok) setF({ ...f, startsAt: '', note: '' })
      }}>
        <select className="select" aria-label="Type" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
          <option value="video">Video call (Google Meet)</option>
          <option value="phone">Phone call</option>
        </select>
        {hosts.length > 1 && (
          <select className="select" aria-label="Host" value={f.hostId} onChange={(e) => setF({ ...f, hostId: e.target.value })}>
            {hosts.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
        )}
        <input className="input" type="datetime-local" required aria-label="When" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
        <select className="select" aria-label="Length" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })}>
          {['15', '30', '45', '60'].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
        <input className="input" placeholder="Agenda (optional)" maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} aria-label="Agenda" />
        <button className="btn btn-primary btn-sm" disabled={busy || !f.startsAt}>{busy ? 'Booking…' : 'Book meeting'}</button>
      </form>
      <p className="help-note">The learner and the host get the details and a calendar invite by email. A host can never have two meetings at the same time.</p>
      <Msg msg={msg} />
    </div>
  )
}
