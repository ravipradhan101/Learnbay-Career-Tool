'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../Icon'
import { CONDITIONS, EXIT_CONDITIONS, LINK_PATHS, MERGE_TAGS, TRIGGERS, describeDelay } from '@/lib/email/catalog'

async function api(method: string, url: string, body?: unknown): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, data } : { ok: false, error: typeof data.error === 'string' ? data.error : 'Something went wrong.' }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}

// ---------- Flow list ----------

export function FlowStatusToggle({ id, status }: { id: string; status: 'active' | 'paused' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <span className="row" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
      <span className={`pill ${status === 'active' ? 'success' : 'warning'}`}>{status === 'active' ? 'Active' : 'Paused'}</span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} title={error || undefined} onClick={async () => {
        setBusy(true)
        const r = await api('PATCH', `/api/admin/emails/flows/${id}`, { status: status === 'active' ? 'paused' : 'active' })
        setBusy(false)
        if (!r.ok) { setError(r.error ?? ''); window.alert(r.error); return }
        router.refresh()
      }}>{status === 'active' ? 'Pause' : 'Resume'}</button>
    </span>
  )
}

export function NewFlowForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<string>(TRIGGERS[0].id)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      setError('')
      const r = await api('POST', '/api/admin/emails/flows', { name, trigger, reentryDays: 0, exitOn: [] })
      setBusy(false)
      if (!r.ok) return setError(r.error ?? '')
      router.push(`/admin/emails/${r.data?.id}`)
    }}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="email-form-grid">
        <div className="field"><label className="label" htmlFor="nf-name">Flow name</label><input id="nf-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Masterclass follow-up" /></div>
        <div className="field">
          <label className="label" htmlFor="nf-trigger">Starts when a learner…</label>
          <select id="nf-trigger" className="select" value={trigger} onChange={(e) => setTrigger(e.target.value)}>{TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </div>
      </div>
      <p className="help-note">New flows start paused. Add emails, preview and test them, then switch the flow on.</p>
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy || name.trim().length < 3}>Create flow</button>
    </form>
  )
}

// ---------- Flow editor ----------

type Flow = { id: string; name: string; description: string | null; trigger: string; status: 'active' | 'paused'; reentry_days: number; exit_on: string[] }
type Step = {
  id: string; position: number; delay_minutes: number; conditions: string[]; subject: string; preheader: string | null; heading: string; body: string
  cta_label: string | null; cta_path: string | null; status: 'active' | 'paused'; stats: { sent: number; skipped: number; failed: number }
}

export function FlowSettings({ flow }: { flow: Flow }) {
  const router = useRouter()
  const [name, setName] = useState(flow.name)
  const [description, setDescription] = useState(flow.description ?? '')
  const [trigger, setTrigger] = useState(flow.trigger)
  const [reentry, setReentry] = useState(String(flow.reentry_days))
  const [exitOn, setExitOn] = useState<string[]>(flow.exit_on)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const r = await api('PATCH', `/api/admin/emails/flows/${flow.id}`, { name, description, trigger, reentryDays: Number(reentry), exitOn })
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: r.error ?? '' })
    if (r.ok) router.refresh()
  }
  async function remove() {
    if (!window.confirm(`Delete "${flow.name}" and all its emails? Learners currently in this flow stop receiving it. A backup is kept, so you can restore it later from Deleted flows.`)) return
    const r = await api('DELETE', `/api/admin/emails/flows/${flow.id}`)
    if (r.ok) router.push('/admin/emails')
    else setMsg({ ok: false, text: r.error ?? '' })
  }

  return (
    <form className="card stack" onSubmit={save}>
      <div className="row between">
        <h2 className="card-title">Flow settings</h2>
        <FlowStatusToggle id={flow.id} status={flow.status} />
      </div>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role="status">{msg.text}</p>}
      <div className="email-form-grid">
        <div className="field"><label className="label" htmlFor="fs-name">Name</label><input id="fs-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field">
          <label className="label" htmlFor="fs-trigger">Starts when a learner…</label>
          <select id="fs-trigger" className="select" value={trigger} onChange={(e) => setTrigger(e.target.value)}>{TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </div>
      </div>
      <div className="field"><label className="label" htmlFor="fs-desc">Description (internal)</label><input id="fs-desc" className="input" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="email-form-grid">
        <div className="field">
          <label className="label" htmlFor="fs-re">Can a learner go through it again?</label>
          <select id="fs-re" className="select" value={reentry} onChange={(e) => setReentry(e.target.value)}>
            <option value="0">No, only once</option>
            {[1, 3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>Yes, after {d} day{d === 1 ? '' : 's'}</option>)}
            {![0, 1, 3, 7, 14, 30, 60, 90].includes(Number(reentry)) && <option value={reentry}>After {reentry} days</option>}
          </select>
        </div>
        <fieldset className="field">
          <legend className="label">Stop the flow early when the learner…</legend>
          {EXIT_CONDITIONS.map((c) => (
            <label key={c} className="checkbox"><input type="checkbox" checked={exitOn.includes(c)} onChange={(e) => setExitOn((x) => (e.target.checked ? [...x, c] : x.filter((y) => y !== c)))} /><span>{CONDITIONS.find((x) => x.id === c)?.label}</span></label>
          ))}
        </fieldset>
      </div>
      <div className="row between">
        <button className="btn btn-primary btn-sm" disabled={busy}>Save settings</button>
        <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={remove}><Icon name="x" size="0.9rem" /> Delete flow</button>
      </div>
    </form>
  )
}

type Draft = { delayValue: string; delayUnit: 'minutes' | 'hours' | 'days'; conditions: string[]; subject: string; preheader: string; heading: string; body: string; ctaLabel: string; ctaPath: string }

function toDraft(s?: Step): Draft {
  const m = s?.delay_minutes ?? 1440
  const unit = m > 0 && m % 1440 === 0 ? 'days' : m > 0 && m % 60 === 0 ? 'hours' : 'minutes'
  return {
    delayValue: String(unit === 'days' ? m / 1440 : unit === 'hours' ? m / 60 : m), delayUnit: unit, conditions: s?.conditions ?? [],
    subject: s?.subject ?? '', preheader: s?.preheader ?? '', heading: s?.heading ?? '', body: s?.body ?? '', ctaLabel: s?.cta_label ?? '', ctaPath: s?.cta_path ?? '{{next_step_path}}',
  }
}
function draftPayload(d: Draft) {
  const v = Math.max(0, Math.round(Number(d.delayValue) || 0))
  return {
    delayMinutes: d.delayUnit === 'days' ? v * 1440 : d.delayUnit === 'hours' ? v * 60 : v, conditions: d.conditions,
    subject: d.subject, preheader: d.preheader, heading: d.heading, body: d.body, ctaLabel: d.ctaLabel, ctaPath: d.ctaLabel ? d.ctaPath : '',
  }
}

function StepForm({ initial, onSave, onCancel, saveLabel }: { initial?: Step; onSave: (payload: ReturnType<typeof draftPayload>) => Promise<string | null>; onCancel?: () => void; saveLabel: string }) {
  const [d, setD] = useState<Draft>(() => toDraft(initial))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; preheader: string; html: string } | null>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  // Live preview, refreshed shortly after typing stops.
  useEffect(() => {
    const t = window.setTimeout(async () => {
      if (d.subject.length < 3 || d.heading.length < 3 || d.body.length < 10) return
      const r = await api('POST', '/api/admin/emails/preview', draftPayload(d))
      if (r.ok && r.data) setPreview(r.data as { subject: string; preheader: string; html: string })
    }, 600)
    return () => window.clearTimeout(t)
  }, [d])

  return (
    <form className="step-form" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      setError('')
      const err = await onSave(draftPayload(d))
      setBusy(false)
      if (err) setError(err)
    }}>
      <div className="stack">
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="email-form-grid">
          <div className="field">
            <label className="label" htmlFor={`d-${initial?.id ?? 'new'}`}>Send</label>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input id={`d-${initial?.id ?? 'new'}`} className="input" style={{ width: '5.5rem' }} inputMode="numeric" value={d.delayValue} onChange={(e) => set('delayValue', e.target.value.replace(/\D/g, '').slice(0, 5))} />
              <select className="select" aria-label="Delay unit" value={d.delayUnit} onChange={(e) => set('delayUnit', e.target.value as Draft['delayUnit'])}>
                <option value="minutes">minutes</option><option value="hours">hours</option><option value="days">days</option>
              </select>
            </div>
            <span className="help-note">after the previous email (or after the trigger, for the first). 0 = immediately.</span>
          </div>
          <fieldset className="field">
            <legend className="label">Only send if the learner… (all must be true)</legend>
            <div className="cond-grid">
              {CONDITIONS.map((c) => (
                <label key={c.id} className="checkbox small"><input type="checkbox" checked={d.conditions.includes(c.id)} onChange={(e) => set('conditions', e.target.checked ? [...d.conditions, c.id] : d.conditions.filter((x) => x !== c.id))} /><span>{c.label}</span></label>
              ))}
            </div>
            <span className="help-note">If not, this email is skipped and the flow moves on.</span>
          </fieldset>
        </div>
        <div className="field"><label className="label">Subject line</label><input className="input" maxLength={150} value={d.subject} onChange={(e) => set('subject', e.target.value)} /><span className="help-note">{d.subject.length}/150 · Keep it under ~50 characters, specific, and without hype words (FREE!!!, guaranteed, urgent) that trip spam filters.</span></div>
        <div className="field"><label className="label">Preview text (shown after the subject in the inbox)</label><input className="input" maxLength={150} value={d.preheader} onChange={(e) => set('preheader', e.target.value)} /></div>
        <div className="field"><label className="label">Heading</label><input className="input" maxLength={150} value={d.heading} onChange={(e) => set('heading', e.target.value)} /></div>
        <div className="field">
          <label className="label">Message</label>
          <textarea className="textarea" rows={9} maxLength={5000} value={d.body} onChange={(e) => set('body', e.target.value)} />
          <span className="help-note">Blank line = new paragraph · lines starting with “- ” become bullets · **text** is bold. Personalise with: {MERGE_TAGS.map((m) => `{{${m.tag}}}`).join(' ')}</span>
        </div>
        <div className="email-form-grid">
          <div className="field"><label className="label">Button text (optional)</label><input className="input" maxLength={60} value={d.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="e.g. Book my 1:1" /></div>
          <div className="field">
            <label className="label">Button links to</label>
            <select className="select" value={d.ctaPath} onChange={(e) => set('ctaPath', e.target.value)} disabled={!d.ctaLabel}>
              {LINK_PATHS.map((l) => <option key={l.path} value={l.path}>{l.label}</option>)}
              {!LINK_PATHS.some((l) => l.path === d.ctaPath) && d.ctaPath && <option value={d.ctaPath}>{d.ctaPath}</option>}
            </select>
          </div>
        </div>
        <div className="row">
          <button className="btn btn-primary btn-sm" disabled={busy}>{saveLabel}</button>
          {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
        </div>
      </div>
      <div className="email-preview">
        <span className="eyebrow">Preview with sample details</span>
        {preview ? (
          <>
            <div className="inbox-line"><b>{preview.subject}</b><span>{preview.preheader}</span></div>
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} />
          </>
        ) : <p className="small muted">Fill in the subject, heading and message to see a preview.</p>}
      </div>
    </form>
  )
}

export function StepList({ flowId, steps }: { flowId: string; steps: Step[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(steps.length === 0)
  const [note, setNote] = useState('')

  async function act(method: string, url: string, body?: unknown) {
    const r = await api(method, url, body)
    if (!r.ok) { setNote(r.error ?? 'Something went wrong.'); return false }
    setNote(typeof r.data?.message === 'string' ? r.data.message : '')
    router.refresh()
    return true
  }

  return (
    <section className="stack">
      <div className="row between"><h2 className="card-title">Emails in this flow</h2>{!adding && <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size="0.9rem" /> Add email</button>}</div>
      {note && <p className="form-ok" role="status">{note}</p>}
      <ol className="step-list">
        {steps.map((s, i) => (
          <li key={s.id} className={`card stack step-card${s.status === 'paused' ? ' paused' : ''}`}>
            <div className="row between">
              <div className="row" style={{ gap: '0.5rem' }}>
                <span className="pill primary">Email {i + 1}</span>
                <span className="pill"><Icon name="clock" size="0.85rem" /> {describeDelay(s.delay_minutes)}</span>
                {s.status === 'paused' && <span className="pill warning">Paused</span>}
                {s.conditions.map((c) => <span key={c} className="pill">{CONDITIONS.find((x) => x.id === c)?.label ?? c}</span>)}
              </div>
              <span className="small muted">30 days: {s.stats.sent} sent · {s.stats.skipped} skipped{s.stats.failed ? ` · ${s.stats.failed} failed` : ''}</span>
            </div>
            {editing === s.id ? (
              <StepForm initial={s} saveLabel="Save email" onCancel={() => setEditing(null)} onSave={async (p) => {
                const r = await api('PATCH', `/api/admin/emails/steps/${s.id}`, p)
                if (!r.ok) return r.error ?? 'Could not save.'
                setEditing(null)
                router.refresh()
                return null
              }} />
            ) : (
              <>
                <div><b>{s.subject}</b>{s.preheader && <span className="muted small"> · {s.preheader}</span>}</div>
                <p className="small muted step-body">{s.body.slice(0, 260)}{s.body.length > 260 ? '…' : ''}</p>
                <div className="row">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(s.id)}>Edit</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => act('POST', `/api/admin/emails/steps/${s.id}/test`)}><Icon name="send" size="0.9rem" /> Send me a test</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => act('PATCH', `/api/admin/emails/steps/${s.id}`, { status: s.status === 'active' ? 'paused' : 'active' })}>{s.status === 'active' ? 'Pause' : 'Resume'}</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} aria-label="Move up" onClick={() => act('POST', `/api/admin/emails/steps/${s.id}/move`, { dir: 'up' })}>↑</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === steps.length - 1} aria-label="Move down" onClick={() => act('POST', `/api/admin/emails/steps/${s.id}/move`, { dir: 'down' })}>↓</button>
                  <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => { if (window.confirm('Delete this email from the flow?')) act('DELETE', `/api/admin/emails/steps/${s.id}`) }}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
      {adding && (
        <div className="card stack">
          <h3 className="card-title">New email</h3>
          <StepForm saveLabel="Add email" onCancel={steps.length ? () => setAdding(false) : undefined} onSave={async (p) => {
            const r = await api('POST', `/api/admin/emails/flows/${flowId}/steps`, p)
            if (!r.ok) return r.error ?? 'Could not add.'
            setAdding(false)
            router.refresh()
            return null
          }} />
        </div>
      )}
    </section>
  )
}

/** Brings back a deleted flow from its last backup. It returns paused. */
export function RestoreDeletedFlow({ id, version, name }: { id: string; version: number; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={async () => {
      if (!window.confirm(`Restore "${name}"? It comes back paused, so nothing is sent until you switch it on.`)) return
      setBusy(true)
      const r = await api('POST', `/api/admin/emails/flows/${id}/restore`, { version })
      setBusy(false)
      if (!r.ok) { window.alert(r.error); return }
      router.push(`/admin/emails/${id}`)
    }}>Restore</button>
  )
}
