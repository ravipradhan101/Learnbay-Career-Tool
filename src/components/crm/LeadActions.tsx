'use client'

import { useState } from 'react'
import { CITIES, CTC_BANDS, SKILLS, TIMELINES, WEEKLY_HOURS, isAnswered, targetRoleOptions, type Answers, type Option, type ToolQuestionKey } from '@/lib/questions'
import { Msg, useAction } from './useAction'

type Opt = { id: string; label: string }

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

type Report = { id: string; name: string; status: string; updatedAt: string | null; builtBy: string | null; versions: number; questions: ToolQuestionKey[]; staffAnswers: Answers | null }

const QUESTION_OPTIONS: Partial<Record<ToolQuestionKey, Option[]>> = { ctc: CTC_BANDS, city: CITIES, weeklyHours: WEEKLY_HOURS, timeline: TIMELINES }
const labelFor = (opts: Option[], v: unknown) => opts.find((o) => o.id === v)?.label

/** What the learner said for a question, in words. */
function said(key: ToolQuestionKey, a: Answers): string {
  const v = a[key]
  if (Array.isArray(v)) return v.length ? v.map((x) => labelFor(SKILLS, x) ?? x).join(', ') : ''
  if (!v) return ''
  if (key === 'targetRole') return labelFor(targetRoleOptions(a), v) ?? String(v)
  return labelFor(QUESTION_OPTIONS[key] ?? [], v) ?? String(v)
}

/**
 * The learner's reports. Each one can be rebuilt from answers staff log on the call: the panel asks only the questions
 * that report needs (pre-filled with what the learner or the last call said), builds it, and can email it to them.
 * The learner's own profile is not changed.
 */
export function ReportsPanel({ leadId, reports, answers, titles }: { leadId: string; reports: Report[]; answers: Answers; titles: Record<string, string> }) {
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  const [working, setWorking] = useState('')
  const [open, setOpen] = useState('')
  async function act(action: 'regenerate' | 'email-report', tool: string, extra: Record<string, unknown> = {}) {
    setWorking(`${action}:${tool}`)
    const r = await run({ action, tool, ...extra })
    setWorking('')
    if (r.ok && action === 'regenerate') setOpen('')
  }
  return (
    <div className="stack" style={{ gap: '0.6rem' }}>
      {reports.map((r) => {
        const ready = r.status === 'ready'
        return (
          <div key={r.id} className="crm-report-box">
            <div className="crm-report">
              <div>
                <b>{r.name}</b>
                <div className="small muted">
                  {ready ? `Ready${r.builtBy ? ` · built by ${r.builtBy}` : ''}${r.updatedAt ? ` · ${new Date(r.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}` : ''}${r.versions ? ` · ${r.versions} earlier version${r.versions === 1 ? '' : 's'} kept` : ''}`
                    : r.status === 'generating' ? 'Being built…' : r.status === 'failed' ? 'Failed last time' : 'Not built yet'}
                </div>
              </div>
              <div className="row" style={{ gap: '0.4rem' }}>
                {ready && <a className="btn btn-ghost btn-sm" href={`/api/crm/leads/${leadId}/report/${r.id}`} target="_blank" rel="noopener">Open PDF</a>}
                {ready && (
                  <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => { if (window.confirm(`Email the ${r.name} to this lead?`)) void act('email-report', r.id) }}>
                    {working === `email-report:${r.id}` ? 'Sending…' : 'Email to lead'}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? '' : r.id)}>
                  {open === r.id ? 'Close' : ready ? 'Rebuild' : 'Build'}
                </button>
              </div>
            </div>
            {open === r.id && <ReportQuestions report={r} answers={answers} titles={titles} busy={busy} working={working === `regenerate:${r.id}`} onBuild={(a) => act('regenerate', r.id, { answers: a })} />}
          </div>
        )
      })}
      <Msg msg={msg} />
    </div>
  )
}

function ReportQuestions({ report, answers, titles, busy, working, onBuild }: {
  report: Report; answers: Answers; titles: Record<string, string>; busy: boolean; working: boolean; onBuild: (a: Answers) => void
}) {
  const start = Object.fromEntries(report.questions.map((k) => [k, report.staffAnswers?.[k] ?? answers[k]])) as Answers
  const [a, setA] = useState<Answers>(start)
  const merged = { ...answers, ...a }
  const missing = report.questions.filter((k) => !isAnswered(merged, k))
  return (
    <form className="crm-questions" onSubmit={(e) => { e.preventDefault(); onBuild(a) }}>
      <p className="small muted" style={{ margin: 0 }}>Ask these on the call and log their answers. The report is rebuilt from them; their own profile stays as they left it.</p>
      {report.questions.map((k) => {
        const id = `rq-${report.id}-${k}`
        const own = said(k, answers)
        const hint = own ? `They said: ${own}` : 'Not answered by the learner yet'
        if (k === 'skills') {
          const chosen = new Set(a.skills ?? [])
          return (
            <fieldset key={k} className="crm-skills">
              <legend className="label">{titles[k] ?? k}</legend>
              {SKILLS.map((s) => (
                <label key={s.id} className="small"><input type="checkbox" checked={chosen.has(s.id)} onChange={(e) => {
                  const next = new Set(chosen)
                  if (e.target.checked) next.add(s.id); else next.delete(s.id)
                  setA({ ...a, skills: [...next] })
                }} /> {s.label}</label>
              ))}
              <span className="crm-faint" style={{ flexBasis: '100%' }}>{hint}</span>
            </fieldset>
          )
        }
        const opts = k === 'targetRole' ? targetRoleOptions(merged) : QUESTION_OPTIONS[k] ?? []
        return (
          <div key={k} className="field">
            <label className="label" htmlFor={id}>{titles[k] ?? k}</label>
            <select id={id} className="select" value={(a[k] as string | undefined) ?? ''} onChange={(e) => setA({ ...a, [k]: e.target.value || undefined })}>
              <option value="">Choose…</option>
              {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <span className="crm-faint">{hint}</span>
          </div>
        )
      })}
      <div className="row" style={{ gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" disabled={busy || missing.length > 0}>{working ? 'Building… (up to a minute)' : report.status === 'ready' ? 'Rebuild report' : 'Build report'}</button>
        {missing.length > 0 && <span className="small muted">Still needed: {missing.map((k) => titles[k] ?? k).join(', ')}</span>}
      </div>
    </form>
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
