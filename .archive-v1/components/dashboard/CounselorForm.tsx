'use client'

import { useMemo, useState } from 'react'
import { Icon } from '../Icon'
import { postJson } from '@/lib/client'
import { COUNSELLOR_SLOTS } from '@/lib/counsellor'

function nextDays(count: number) {
  const days: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    days.push({ value, label })
  }
  return days
}

export function CounselorForm({ phone, existing }: { phone: string; existing: { when: string; status: string } | null }) {
  const days = useMemo(() => nextDays(7), [])
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await postJson('/api/counsellor', { date: date || null, slot, note })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setDone(String(res.data.message))
  }

  return (
    <div className="grid-2">
      <section className="card stack">
        {done ? (
          <div className="stack" style={{ alignItems: 'flex-start' }}>
            <span className="toast-icon success"><Icon name="checkCircle" size="1.5rem" /></span>
            <h2 className="card-title">You&apos;re all set</h2>
            <p className="muted">{done}</p>
            <p className="small muted">We&apos;ve also emailed you a confirmation.</p>
          </div>
        ) : (
          <form className="stack" onSubmit={submit} noValidate>
            {existing && (
              <p className="form-success">We already have your request for {existing.when}. Need a different time? Send another request below.</p>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="field">
              <span className="label">We&apos;ll call you on</span>
              <input className="input" readOnly value={phone || 'Phone number not set'} aria-label="Your phone number" />
            </div>
            <div className="field">
              <label className="label" htmlFor="c-date">Preferred day</label>
              <select id="c-date" className="select" value={date} onChange={(e) => setDate(e.target.value)}>
                <option value="">Any day</option>
                {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ marginBottom: '0.375rem' }}>Preferred time</legend>
              <div className="option-list" role="radiogroup">
                {COUNSELLOR_SLOTS.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={slot === s.id} className="option" onClick={() => setSlot(s.id)}>
                    <span className="option-mark">{slot === s.id && <Icon name="check" size="0.8rem" />}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label className="label" htmlFor="c-note">Anything you&apos;d like to discuss? (Optional)</label>
              <textarea id="c-note" className="textarea" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. fees and EMI options, weekend batches, switching from QA to AI" />
            </div>
            <button className="btn btn-primary btn-lg" disabled={busy || !slot || !phone}>
              {busy ? <span className="spinner" /> : <><Icon name="phone" size="1.1rem" /> Request a Call Back</>}
            </button>
          </form>
        )}
      </section>
      <section className="card stack">
        <h2 className="card-title"><Icon name="users" className="text-primary" /> What you&apos;ll get from the call</h2>
        <ul className="list-check">
          {[
            'A walkthrough of your AI career report with an expert',
            'The right Learnbay program for your profile and goals',
            'Clear answers on fees, EMI options and batch timings',
            'A realistic plan that fits your work schedule',
          ].map((t) => <li key={t}><Icon name="checkCircle" size="1.1rem" />{t}</li>)}
        </ul>
        <p className="small muted">Your counselor will already have your report, so you can go straight to your questions.</p>
      </section>
    </div>
  )
}
