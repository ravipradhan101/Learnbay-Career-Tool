'use client'

import { useState } from 'react'
import {
  CITIES, CTC_BANDS, DOMAINS, EXPERIENCE, GOALS, INTERESTS, PROGRAMMER, ROLES, ROLE_OTHER, SKILLS, TIMELINES, WEEKLY_HOURS, COUNTRY_CODES,
  targetRoleOptions, type Answers, type Option,
} from '@/lib/questions'
import { LEAD_STATUSES } from '@/lib/crm/roles'
import { Msg, useAction } from './useAction'

type Opt = { id: string; label: string }

export function StatusControl({ leadId, status }: { leadId: string; status: string }) {
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  return (
    <div className="field">
      <label className="label" htmlFor="lead-status">Status</label>
      <select id="lead-status" className="select" value={status} disabled={busy} onChange={(e) => void run({ action: 'status', status: e.target.value })}>
        {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <Msg msg={msg} />
    </div>
  )
}

export function ReassignControl({ leadId, ownerId, options }: { leadId: string; ownerId: string | null; options: Opt[] }) {
  const [to, setTo] = useState(ownerId ?? '')
  const [note, setNote] = useState('')
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  return (
    <form className="field" onSubmit={(e) => { e.preventDefault(); void run({ action: 'reassign', to, note }) }}>
      <label className="label" htmlFor="lead-owner">Give to</label>
      <select id="lead-owner" className="select" value={to} onChange={(e) => setTo(e.target.value)}>
        {!ownerId && <option value="">Unassigned</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {to && to !== ownerId && (
        <>
          <input className="input" placeholder="Why (optional)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Reason" />
          <button className="btn btn-soft btn-sm" disabled={busy}>{busy ? 'Moving…' : 'Reassign'}</button>
        </>
      )}
      <Msg msg={msg} />
    </form>
  )
}

function Select({ id, label, value, options, onChange }: { id: string; label: string; value: string | undefined; options: Option[]; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not given</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  )
}

/** Fill in or correct the learner's details. Only what changed is saved, and the change is logged under your name. */
export function ProfileForm({ leadId, name, phoneCountry, phone, answers }: { leadId: string; name: string; phoneCountry: string; phone: string; answers: Answers }) {
  const [c, setC] = useState({ name, phoneCountry: phoneCountry || '+91', phone })
  const [a, setA] = useState<Answers>(answers)
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  const put = (k: keyof Answers) => (v: string) => setA({ ...a, [k]: v || undefined })
  const skills = new Set(a.skills ?? [])
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault()
      const changed = Object.fromEntries(Object.entries(a).filter(([k, v]) => v !== undefined && JSON.stringify(v) !== JSON.stringify(answers[k as keyof Answers])))
      void run({ action: 'profile', ...(c.name !== name ? { name: c.name } : {}), ...(c.phone !== phone || c.phoneCountry !== phoneCountry ? { phone: c.phone, phoneCountry: c.phoneCountry } : {}), answers: changed })
    }}>
      <div className="crm-form-grid">
        <div className="field"><label className="label" htmlFor="pf-name">Full name</label><input id="pf-name" className="input" maxLength={80} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
        <div className="field">
          <label className="label" htmlFor="pf-phone">Phone</label>
          <div className="row" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
            <select className="select" style={{ width: '6.5rem' }} aria-label="Country code" value={c.phoneCountry} onChange={(e) => setC({ ...c, phoneCountry: e.target.value })}>
              {COUNTRY_CODES.map((x) => <option key={x.code} value={x.code}>{x.flag} {x.code}</option>)}
            </select>
            <input id="pf-phone" className="input" inputMode="tel" maxLength={15} value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
          </div>
        </div>
        <Select id="pf-role" label="Current role" value={a.role} options={[...ROLES, { id: ROLE_OTHER, label: 'Other' }]} onChange={put('role')} />
        {a.role === ROLE_OTHER && <div className="field"><label className="label" htmlFor="pf-ro">Their role</label><input id="pf-ro" className="input" maxLength={60} value={a.roleOther ?? ''} onChange={(e) => setA({ ...a, roleOther: e.target.value })} /></div>}
        <Select id="pf-exp" label="Experience" value={a.experience} options={EXPERIENCE} onChange={put('experience')} />
        <Select id="pf-prog" label="Codes?" value={a.programmer} options={PROGRAMMER} onChange={put('programmer')} />
        <Select id="pf-int" label="Interested in" value={a.interest} options={INTERESTS} onChange={put('interest')} />
        <Select id="pf-dom" label="Industry" value={a.domain} options={DOMAINS} onChange={put('domain')} />
        {a.domain === 'other' && <div className="field"><label className="label" htmlFor="pf-do">Their industry</label><input id="pf-do" className="input" maxLength={60} value={a.domainOther ?? ''} onChange={(e) => setA({ ...a, domainOther: e.target.value })} /></div>}
        <Select id="pf-goal" label="Goal" value={a.goal} options={GOALS} onChange={put('goal')} />
        <Select id="pf-target" label="Target role" value={a.targetRole} options={targetRoleOptions(a)} onChange={put('targetRole')} />
        <Select id="pf-ctc" label="Current CTC" value={a.ctc} options={CTC_BANDS} onChange={put('ctc')} />
        <Select id="pf-city" label="City" value={a.city} options={CITIES} onChange={put('city')} />
        <Select id="pf-hours" label="Hours a week" value={a.weeklyHours} options={WEEKLY_HOURS} onChange={put('weeklyHours')} />
        <Select id="pf-time" label="Timeline" value={a.timeline} options={TIMELINES} onChange={put('timeline')} />
      </div>
      <fieldset className="crm-skills">
        <legend className="label">Skills they have</legend>
        {SKILLS.map((s) => (
          <label key={s.id} className="small"><input type="checkbox" checked={skills.has(s.id)} onChange={(e) => {
            const next = new Set(skills)
            if (e.target.checked) next.add(s.id); else next.delete(s.id)
            setA({ ...a, skills: [...next] })
          }} /> {s.label}</label>
        ))}
      </fieldset>
      <Msg msg={msg} />
      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
    </form>
  )
}

type Report = { id: string; name: string; status: string; missing: string[] }

/** Build a report for the lead, open it, and email it to them. */
export function ReportsPanel({ leadId, reports }: { leadId: string; reports: Report[] }) {
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  const [working, setWorking] = useState('')
  async function act(action: 'generate' | 'email-report', tool: string) {
    setWorking(`${action}:${tool}`)
    await run({ action, tool })
    setWorking('')
  }
  return (
    <div className="stack" style={{ gap: '0.6rem' }}>
      {reports.map((r) => (
        <div key={r.id} className="crm-report">
          <div><b>{r.name}</b><div className="small muted">{r.status === 'ready' ? 'Ready' : r.status === 'generating' ? 'Being built…' : r.status === 'failed' ? 'Failed last time' : r.missing.length ? `Needs: ${r.missing.join(', ')}` : 'Not built yet'}</div></div>
          <div className="row" style={{ gap: '0.4rem' }}>
            {r.status === 'ready' ? (
              <>
                <a className="btn btn-ghost btn-sm" href={`/api/crm/leads/${leadId}/report/${r.id}`} target="_blank" rel="noopener">Open PDF</a>
                <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => { if (window.confirm(`Email the ${r.name} to this lead?`)) void act('email-report', r.id) }}>
                  {working === `email-report:${r.id}` ? 'Sending…' : 'Email to lead'}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-soft btn-sm" disabled={busy || r.missing.length > 0} onClick={() => void act('generate', r.id)} title={r.missing.length ? 'Fill in the profile details first' : undefined}>
                {working === `generate:${r.id}` ? 'Building… (up to a minute)' : 'Generate'}
              </button>
            )}
          </div>
        </div>
      ))}
      <Msg msg={msg} />
    </div>
  )
}

/** Send one of the ready-made emails (or your own) to the lead's registered address. */
export function EmailPanel({ leadId, email, templates }: { leadId: string; email: string; templates: { id: string; label: string; subject: string; body: string }[] }) {
  const [tpl, setTpl] = useState(templates[0]?.id ?? 'custom')
  const t = templates.find((x) => x.id === tpl)
  const [subject, setSubject] = useState(t?.subject ?? '')
  const [message, setMessage] = useState(t?.body ?? '')
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  return (
    <form className="stack" style={{ gap: '0.6rem' }} onSubmit={(e) => {
      e.preventDefault()
      if (window.confirm(`Send this email to ${email}?`)) void run({ action: 'email', template: tpl, subject, message })
    }}>
      <select className="select" aria-label="Email" value={tpl} onChange={(e) => {
        const next = templates.find((x) => x.id === e.target.value)
        setTpl(e.target.value); setSubject(next?.subject ?? ''); setMessage(next?.body ?? '')
      }}>
        {templates.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      <input className="input" aria-label="Subject" placeholder="Subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="textarea" aria-label="Message" rows={4} maxLength={4000} placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <p className="help-note">Goes to {email} only, signed with your name, with a button back into their Career Studio.</p>
      <Msg msg={msg} />
      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? 'Sending…' : 'Send email'}</button>
    </form>
  )
}

/** In 1 hour / tomorrow 11 AM style quick picks, or any date and time. */
export function AddTask({ leadId }: { leadId: string }) {
  const [kind, setKind] = useState<'follow_up' | 'reminder'>('follow_up')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  const quick = [
    { label: 'In 1 hour', at: () => new Date(Date.now() + 3_600_000) },
    { label: 'Tomorrow 11 AM', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d } },
    { label: 'In 3 days', at: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(11, 0, 0, 0); return d } },
  ]
  return (
    <form className="crm-inline-form" onSubmit={async (e) => {
      e.preventDefault()
      const r = await run({ action: 'task', kind, title, dueAt: new Date(due).toISOString() })
      if (r.ok) { setTitle(''); setDue('') }
    }}>
      <select className="select" aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as 'follow_up' | 'reminder')}>
        <option value="follow_up">Follow-up call</option>
        <option value="reminder">Reminder</option>
      </select>
      <input className="input" placeholder={kind === 'follow_up' ? 'e.g. Discuss fee plan' : 'e.g. Send brochure'} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="What" />
      <input className="input" type="datetime-local" required value={due} onChange={(e) => setDue(e.target.value)} aria-label="When" />
      <div className="row" style={{ gap: '0.35rem' }}>
        {quick.map((q) => <button key={q.label} type="button" className="pill-btn" onClick={() => setDue(local(q.at()))}>{q.label}</button>)}
      </div>
      <button className="btn btn-soft btn-sm" disabled={busy || !due}>{busy ? 'Saving…' : 'Set reminder'}</button>
      <Msg msg={msg} />
    </form>
  )
}

export function NoteForm({ leadId }: { leadId: string }) {
  const [text, setText] = useState('')
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  return (
    <form className="stack" style={{ gap: '0.5rem' }} onSubmit={async (e) => { e.preventDefault(); const r = await run({ action: 'note', text }); if (r.ok) setText('') }}>
      <textarea className="textarea" rows={2} maxLength={2000} placeholder="What did you learn? (only the team sees notes)" value={text} onChange={(e) => setText(e.target.value)} aria-label="Note" />
      <Msg msg={msg} />
      <button className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy || text.trim().length < 2}>Add note</button>
    </form>
  )
}
