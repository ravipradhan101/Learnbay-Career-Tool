'use client'

import { useMemo, useState } from 'react'
import { Icon } from '../Icon'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'
import { SESSION_TIMES } from '@/lib/sessions'

function nextDays(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      isToday: i === 0,
    }
  })
}

/** Times earlier than the next full hour are hidden for today. */
function timeAvailable(time: string, isToday: boolean) {
  if (!isToday) return true
  const [hm, ap] = time.split(' ')
  let h = Number(hm.split(':')[0])
  if (ap === 'PM' && h !== 12) h += 12
  return h > new Date().getHours() + 1
}

export function SessionBooking({ phone }: { phone: string }) {
  const days = useMemo(() => nextDays(12), [])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const selectedDay = days.find((d) => d.value === date)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await postJson('/api/sessions', { date, time, note })
    setBusy(false)
    if (!res.ok) { track('error', 'session_booking', { status: res.status }); return setError(res.error) }
    track('action', 'session_booked', { time })
    setDone(String(res.data.message))
  }

  if (done) {
    return (
      <section className="card stack session-done" style={{ alignItems: 'flex-start' }}>
        {/* The ring and tick draw themselves in once, so a completed booking
            lands as a moment rather than appearing fully formed. */}
        <span className="done-mark" aria-hidden="true">
          <svg viewBox="0 0 52 52" width="46" height="46">
            <circle className="done-ring" cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path className="done-tick" d="M15.5 26.5l7 7 14-15" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="card-title">You&apos;re booked in</h2>
        <p className="muted">{done}</p>
        <button type="button" className="btn btn-soft btn-sm" onClick={() => { setDone(''); setDate(''); setTime(''); setNote('') }}>Book another session</button>
      </section>
    )
  }

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      {error && <p className="form-error" role="alert">{error}</p>}
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: '0.375rem' }}>Pick a date</legend>
        <div className="date-grid" role="radiogroup">
          {days.map((d) => (
            <button key={d.value} type="button" role="radio" aria-checked={date === d.value} className="date-chip" onClick={() => { setDate(d.value); setTime('') }}>
              {d.day}<b>{d.date}</b>{d.month}
            </button>
          ))}
        </div>
      </fieldset>
      {date && (
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: '0.375rem' }}>Pick a time (IST)</legend>
          <div className="time-grid" role="radiogroup">
            {SESSION_TIMES.filter((t) => timeAvailable(t, Boolean(selectedDay?.isToday))).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={time === t} className="chip" onClick={() => setTime(t)}>{t}</button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="field">
        <label className="label" htmlFor="s-note">Anything you&apos;d like to discuss? (optional)</label>
        <textarea id="s-note" className="textarea" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. moving from QA to AI, weekend learning, fees and EMI" />
      </div>
      <p className="small muted">We&apos;ll connect with you on <b style={{ color: 'var(--ink-2)' }}>{phone || 'your phone number'}</b>.</p>
      <button className="btn btn-primary btn-lg" disabled={busy || !date || !time}>
        {busy ? <span className="spinner" /> : <><Icon name="calendar" size="1.1rem" /> Book my session</>}
      </button>
    </form>
  )
}
