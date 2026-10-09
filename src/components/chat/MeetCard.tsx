'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { track } from '@/lib/analytics'
import { getJson, postJson } from '@/lib/client'

type MeetingView = { id: string; mode: 'video' | 'phone'; startsAt: string; endsAt: string; when: string; meetUrl: string | null; host: string; status: string }
type Slots = { date: string; label: string; slots: { startsAt: string; time: string; open: boolean; passed?: boolean }[] }[]
type Data = { enabled: boolean; meeting: MeetingView | null; now: { startsAt: string; label: string } | null; days: Slots }
type Done = (value: unknown) => void

const gcal = (m: MeetingView) => {
  const f = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `Learnbay career call with ${m.host}`, dates: `${f(m.startsAt)}/${f(m.endsAt)}`, details: m.meetUrl ? `Join on Google Meet: ${m.meetUrl}` : 'Learnbay career call', ...(m.meetUrl ? { location: m.meetUrl } : {}) })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

function Booked({ m }: { m: MeetingView }) {
  const soon = new Date(m.startsAt).getTime() - Date.now() < 10 * 60_000
  return (
    <div className="tc-card tc-booked">
      <div className="tc-booked-head">
        <span className="tc-booked-icon"><Icon name="video" size="1.2rem" /></span>
        <span><small>Your video call with {m.host}, a Learnbay expert</small><b>{m.when} <em>IST</em></b></span>
        <span className="tc-booked-tag"><Icon name="checkCircle" size="0.85rem" /> Confirmed</span>
      </div>
      <ul className="tc-booked-list">
        <li><Icon name="video" size="0.9rem" /> {m.meetUrl ? 'On Google Meet: join from the button below, or from your email.' : 'Your expert will email you the Google Meet link before the call.'}</li>
        <li><Icon name="file" size="0.9rem" /> Keep your reports handy: your expert uses them to go straight to your plan.</li>
        <li><Icon name="mail" size="0.9rem" /> The details and a calendar invite are in your email.</li>
      </ul>
      <div className="tc-actions">
        {m.meetUrl && <a className={`tc-btn ${soon ? 'tc-btn-accent' : 'tc-btn-ghost'} tc-btn-sm`} href={m.meetUrl} target="_blank" rel="noopener noreferrer"><Icon name="video" size="0.9rem" /> Join Google Meet</a>}
        <a className="tc-btn tc-btn-ghost tc-btn-sm" href={gcal(m)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size="0.9rem" /> Add to Google Calendar</a>
      </div>
    </div>
  )
}

/**
 * A video call with a Learnbay expert on Google Meet: "connect now" (an expert joins in 30 minutes) or a 30-minute
 * slot today or tomorrow. Once booked, the card shows the meeting with its Meet link.
 */
export function MeetCard({ mode, source, live, onDone }: { mode: 'now' | 'pick'; source: string; live: boolean; onDone: Done }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [next, setNext] = useState<{ startsAt: string; label: string } | null>(null)
  const [picking, setPicking] = useState(mode === 'pick')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const started = useRef(false)

  const load = useCallback(async () => {
    const r = await getJson('/api/meetings')
    if (!r.ok) { setError(r.error); return null }
    const d = r.data as unknown as Data
    setData(d)
    setDate((cur) => cur || d.days.find((x) => x.slots.some((s) => s.open))?.date || d.days[0]?.date || '')
    return d
  }, [])

  const book = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true)
    setError('')
    setNext(null)
    const r = await postJson('/api/meetings', { ...body, source })
    setBusy(false)
    if (!r.ok) {
      track('error', 'meet_booking', { status: r.status })
      setError(r.error)
      setNext((r.data.next as { startsAt: string; label: string } | null) ?? null)
      setPicking(true)
      void load()
      return
    }
    const meeting = r.data.meeting as MeetingView
    track('action', body.now ? 'meet_connect_now' : 'meet_booked', { from: source })
    setData((d) => ({ ...(d ?? { enabled: true, now: null, days: [] }), meeting }))
    if (live) onDone({ when: meeting.when, host: meeting.host, meetUrl: meeting.meetUrl })
  }, [live, load, onDone, source])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void load().then((d) => {
      if (!d) return
      if (d.meeting) { if (live) onDone({ when: d.meeting.when, host: d.meeting.host, meetUrl: d.meeting.meetUrl, existing: true }); return }
      if (!d.enabled) { if (live) onDone({ unavailable: true }); return }
      // They already said "yes, connect me" in the chat: book straight away.
      if (mode === 'now' && live) void book({ now: true })
    })
  }, [book, live, load, mode, onDone])

  // Couldn't load: try again, or let the chat move on (it never waits on a card that can't load).
  if (error && !data) {
    return (
      <div className="tc-card">
        <p className="tc-error" role="alert">{error || 'Couldn’t load the times just now.'}</p>
        <div className="tc-actions-row">
          <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => { setError(''); void load() }}><Icon name="refresh" size="0.9rem" /> Try again</button>
          {live && <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => onDone({ unavailable: true })}>Skip for now</button>}
        </div>
      </div>
    )
  }
  if (!data || (busy && !picking)) return <div className="tc-card tc-booking"><span className="spinner" /> {mode === 'now' ? 'Finding a free expert for you…' : 'Loading open times…'}</div>
  if (data.meeting) return <Booked m={data.meeting} />
  if (!data.enabled) return <div className="tc-card"><p className="small">Video calls with our experts open soon. Meanwhile, a free phone call with a Senior Counsellor is one tap away.</p></div>
  if (!live) return null

  const day = data.days.find((d) => d.date === date)
  return (
    <div className="tc-card tc-booking">
      <span className="tc-eyebrow"><Icon name="video" size="0.85rem" /> Video call on Google Meet · 30 minutes · free</span>
      {error && <p className="tc-error" role="alert">{error}</p>}
      {next && (
        <button type="button" className="tc-btn tc-btn-accent" disabled={busy} onClick={() => void book({ startsAt: next.startsAt })}>
          <Icon name="calendar" size="1rem" /> Book the next free time: {next.label}
        </button>
      )}
      {data.now && !next && (
        <button type="button" className="tc-btn tc-btn-accent" disabled={busy} onClick={() => void book({ now: true })}>
          <Icon name="video" size="1rem" /> Connect me now · an expert joins at {data.now.label}
        </button>
      )}
      {picking && (
        <>
          <span className="tc-eyebrow">Or pick a time (IST)</span>
          <div className="tc-days" role="radiogroup" aria-label="Day">
            {data.days.map((d) => {
              const any = d.slots.some((s) => s.open)
              return (
                <button key={d.date} type="button" role="radio" aria-checked={date === d.date} className="tc-day" disabled={!any} onClick={() => { setDate(d.date); setSlot('') }}>
                  <small>{d.label}</small><b>{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b>{!any && <em>Fully booked</em>}
                </button>
              )
            })}
          </div>
          {day && (
            <div className="tc-slots" role="radiogroup" aria-label="Time">
              {day.slots.map((s) => (
                <button key={s.startsAt} type="button" role="radio" aria-checked={slot === s.startsAt} disabled={!s.open}
                  className={`tc-slot${slot === s.startsAt ? ' on' : ''}`} onClick={() => setSlot(s.startsAt)}>
                  <b>{s.time}</b><small>{s.open ? 'Open' : s.passed ? 'Passed' : 'Busy'}</small>
                </button>
              ))}
            </div>
          )}
          <div className="tc-actions">
            <button type="button" className="tc-btn tc-btn-accent" disabled={busy || !slot} onClick={() => void book({ startsAt: slot })}>
              {busy ? <span className="spinner" /> : <><Icon name="calendar" size="1rem" /> Book my video call</>}
            </button>
          </div>
        </>
      )}
      {!picking && <button type="button" className="tc-btn tc-btn-ghost tc-btn-sm" onClick={() => setPicking(true)}>Pick another time</button>}
    </div>
  )
}
