'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../Icon'

const TOPICS = ['Aptitude', 'Full form', 'Concept', 'Tools']
type Area = { id: string; label: string }

async function api(method: string, url: string, body?: unknown): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, data } : { ok: false, error: typeof data.error === 'string' ? data.error : 'Something went wrong.' }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}

// ---------- List page ----------

export function TestVisibilityToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      <span className={`pill ${enabled ? 'success' : 'warning'}`}>{enabled ? 'Visible to learners' : 'Hidden from learners'}</span>
      <button type="button" className={`btn btn-sm ${enabled ? 'btn-outline' : 'btn-primary'}`} disabled={busy} onClick={async () => {
        if (enabled && !window.confirm('Hide the eligibility test for every learner? Learners who already took it keep seeing their result.')) return
        setBusy(true)
        await api('POST', '/api/admin/eligibility/settings', { enabled: !enabled })
        setBusy(false)
        router.refresh()
      }}>{enabled ? 'Pause the test' : 'Show the test'}</button>
    </div>
  )
}

export function SetStatusToggle({ id, status }: { id: string; status: 'active' | 'paused' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
      setBusy(true)
      const r = await api('PATCH', `/api/admin/eligibility/sets/${id}`, { status: status === 'active' ? 'paused' : 'active' })
      setBusy(false)
      if (!r.ok) { window.alert(r.error); return }
      router.refresh()
    }}>{status === 'active' ? 'Pause' : 'Activate'}</button>
  )
}

export function NewSetForm({ areas, sets }: { areas: Area[]; sets: { id: string; name: string }[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [area, setArea] = useState('any')
  const [copyFrom, setCopyFrom] = useState('')
  const [source, setSource] = useState('bank')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      setError('')
      const r = await api('POST', '/api/admin/eligibility/sets', { name, programArea: area, source, copyFrom: copyFrom || undefined })
      setBusy(false)
      if (!r.ok) return setError(r.error ?? '')
      router.push(`/admin/eligibility/${r.data?.id}`)
    }}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="email-form-grid">
        <div className="field"><label className="label" htmlFor="ns-name">Set name</label><input id="ns-name" className="input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cloud & DevOps, October intake" /></div>
        <div className="field">
          <label className="label" htmlFor="ns-area">Used for learners interested in</label>
          <select id="ns-area" className="select" value={area} onChange={(e) => setArea(e.target.value)}>{areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        </div>
      </div>
      <div className="email-form-grid">
        <div className="field">
          <label className="label" htmlFor="ns-copy">Start from</label>
          <select id="ns-copy" className="select" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
            <option value="">An empty set</option>
            {sets.map((s) => <option key={s.id} value={s.id}>A copy of “{s.name}”</option>)}
          </select>
        </div>
        {!copyFrom && (
          <div className="field">
            <label className="label" htmlFor="ns-src">How questions are picked</label>
            <select id="ns-src" className="select" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="bank">Only from this set’s questions</option>
              <option value="ai">AI-generated per learner (this set is the fallback)</option>
            </select>
          </div>
        )}
      </div>
      <p className="help-note">New sets start paused. Add questions, check the settings, then activate it. The newest active set for a program area is the one learners get.</p>
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy || name.trim().length < 3}>Create question set</button>
    </form>
  )
}

// ---------- Set editor ----------

type SetData = {
  id: string; name: string; description: string | null; program_area: string; source: 'ai' | 'bank'; questions_per_test: number
  seconds_per_question: number; total_seconds: number; max_attempts: number; status: 'active' | 'paused'; version: number
}
export type QuestionData = { id: string; topic: string; text: string; options: string[]; correct: number; seconds: number | null; status: 'active' | 'paused' }

export function SetSettings({ set, areas }: { set: SetData; areas: Area[] }) {
  const router = useRouter()
  const [f, setF] = useState({
    name: set.name, description: set.description ?? '', programArea: set.program_area, source: set.source, questionsPerTest: String(set.questions_per_test),
    secondsPerQuestion: String(set.seconds_per_question), totalMinutes: String(Math.round((set.total_seconds / 60) * 10) / 10), maxAttempts: String(set.max_attempts),
  })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set_ = <K extends keyof typeof f>(k: K, v: string) => setF((x) => ({ ...x, [k]: v }))
  const suggested = Math.ceil((Number(f.questionsPerTest) || 0) * (Number(f.secondsPerQuestion) || 0) / 60 * 1.2)

  return (
    <form className="card stack" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      const r = await api('PATCH', `/api/admin/eligibility/sets/${set.id}`, {
        name: f.name, description: f.description, programArea: f.programArea, source: f.source, questionsPerTest: Number(f.questionsPerTest),
        secondsPerQuestion: Number(f.secondsPerQuestion), totalSeconds: Math.round(Number(f.totalMinutes) * 60), maxAttempts: Number(f.maxAttempts),
      })
      setBusy(false)
      setMsg(r.ok ? { ok: true, text: 'Saved as a new version.' } : { ok: false, text: r.error ?? '' })
      if (r.ok) router.refresh()
    }}>
      <div className="row between">
        <h2 className="card-title">Test settings</h2>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <span className={`pill ${set.status === 'active' ? 'success' : 'warning'}`}>{set.status === 'active' ? 'Active' : 'Paused'}</span>
          <SetStatusToggle id={set.id} status={set.status} />
        </div>
      </div>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role="status">{msg.text}</p>}
      <div className="email-form-grid">
        <div className="field"><label className="label" htmlFor="ss-name">Name</label><input id="ss-name" className="input" maxLength={100} value={f.name} onChange={(e) => set_('name', e.target.value)} /></div>
        <div className="field">
          <label className="label" htmlFor="ss-area">Used for learners interested in</label>
          <select id="ss-area" className="select" value={f.programArea} onChange={(e) => set_('programArea', e.target.value)}>{areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        </div>
      </div>
      <div className="field"><label className="label" htmlFor="ss-desc">Description (internal)</label><input id="ss-desc" className="input" maxLength={400} value={f.description} onChange={(e) => set_('description', e.target.value)} /></div>
      <div className="field">
        <label className="label" htmlFor="ss-src">How questions are picked</label>
        <select id="ss-src" className="select" value={f.source} onChange={(e) => set_('source', e.target.value)}>
          <option value="bank">Only from the questions below (random draw, spread across topics)</option>
          <option value="ai">AI-generated for each learner’s profile (the questions below are the fallback)</option>
        </select>
      </div>
      <div className="settings-grid">
        <div className="field"><label className="label" htmlFor="ss-n">Questions per test</label><input id="ss-n" className="input" inputMode="numeric" value={f.questionsPerTest} onChange={(e) => set_('questionsPerTest', e.target.value.replace(/\D/g, ''))} /></div>
        <div className="field"><label className="label" htmlFor="ss-q">Seconds per question</label><input id="ss-q" className="input" inputMode="numeric" value={f.secondsPerQuestion} onChange={(e) => set_('secondsPerQuestion', e.target.value.replace(/\D/g, ''))} /><span className="help-note">A question can override this.</span></div>
        <div className="field"><label className="label" htmlFor="ss-t">Total test time (minutes)</label><input id="ss-t" className="input" inputMode="decimal" value={f.totalMinutes} onChange={(e) => set_('totalMinutes', e.target.value.replace(/[^\d.]/g, ''))} /><span className="help-note">Suggested: about {suggested} min.</span></div>
        <div className="field"><label className="label" htmlFor="ss-a">Attempts per learner</label><input id="ss-a" className="input" inputMode="numeric" value={f.maxAttempts} onChange={(e) => set_('maxAttempts', e.target.value.replace(/\D/g, ''))} /></div>
      </div>
      <p className="help-note">Changes apply to tests started after you save. A test already in progress keeps the settings it started with.</p>
      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy}>Save settings</button>
    </form>
  )
}

function QuestionForm({ initial, onSave, onCancel, label }: { initial?: QuestionData; onSave: (q: Omit<QuestionData, 'id' | 'status'>) => Promise<string | null>; onCancel?: () => void; label: string }) {
  const [topic, setTopic] = useState(initial?.topic ?? 'Concept')
  const [text, setText] = useState(initial?.text ?? '')
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '', '', ''])
  const [correct, setCorrect] = useState(initial?.correct ?? 0)
  const [seconds, setSeconds] = useState(initial?.seconds ? String(initial.seconds) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return (
    <form className="stack question-form" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      setError('')
      const err = await onSave({ topic, text, options: options.map((o) => o.trim()).filter(Boolean), correct, seconds: seconds ? Number(seconds) : null })
      setBusy(false)
      if (err) setError(err)
    }}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="field">
        <label className="label">Question</label>
        <input className="input" maxLength={240} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. What does API stand for?" />
        <span className={`help-note${words > 14 ? ' text-danger' : ''}`}>{words} words{words > 14 ? ' · long for a timed question; aim for 12 or fewer' : ''}</span>
      </div>
      <fieldset className="field">
        <legend className="label">Answer options (select the correct one)</legend>
        <div className="stack" style={{ gap: '0.5rem' }}>
          {options.map((o, i) => (
            <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
              <input type="radio" name={`correct-${initial?.id ?? 'new'}`} aria-label={`Option ${i + 1} is correct`} checked={correct === i} onChange={() => setCorrect(i)} />
              <input className="input" maxLength={120} value={o} onChange={(e) => setOptions((x) => x.map((y, j) => (j === i ? e.target.value : y)))} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
              {options.length > 2 && (
                <button type="button" className="icon-btn" aria-label={`Remove option ${i + 1}`} onClick={() => {
                  setOptions((x) => x.filter((_, j) => j !== i))
                  setCorrect((c) => (c === i ? 0 : c > i ? c - 1 : c))
                }}><Icon name="x" size="1rem" /></button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && <button type="button" className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setOptions((x) => [...x, ''])}>+ Add option</button>}
      </fieldset>
      <div className="email-form-grid">
        <div className="field">
          <label className="label">Topic</label>
          <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="field">
          <label className="label">Time for this question (seconds, optional)</label>
          <input className="input" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Uses the set default" />
        </div>
      </div>
      <div className="row">
        <button className="btn btn-primary btn-sm" disabled={busy}>{label}</button>
        {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export function QuestionList({ setId, questions, defaultSeconds }: { setId: string; questions: QuestionData[]; defaultSeconds: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [show, setShow] = useState<'all' | 'active' | 'paused'>('all')
  const list = questions.filter((q) => show === 'all' || q.status === show)
  const active = questions.filter((q) => q.status === 'active').length

  async function save(method: string, url: string, body: unknown) {
    const r = await api(method, url, body)
    if (!r.ok) return r.error ?? 'Could not save.'
    setNote(typeof r.data?.warning === 'string' && r.data.warning ? { ok: false, text: r.data.warning } : { ok: true, text: 'Saved as a new version.' })
    router.refresh()
    return null
  }

  return (
    <section className="card stack">
      <div className="row between">
        <div>
          <h2 className="card-title">Questions</h2>
          <p className="card-sub">{active} active · {questions.length - active} hidden · default {defaultSeconds}s each</p>
        </div>
        <div className="row">
          <nav className="range-pills" aria-label="Filter questions">
            {(['all', 'active', 'paused'] as const).map((k) => <button key={k} type="button" className="pill-btn" aria-current={show === k ? 'true' : undefined} onClick={() => setShow(k)}>{k === 'all' ? 'All' : k === 'active' ? 'Active' : 'Hidden'}</button>)}
          </nav>
          {!adding && <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size="0.9rem" /> Add question</button>}
        </div>
      </div>
      {note && <p className={note.ok ? 'form-ok' : 'form-error'} role="status">{note.text}</p>}
      {adding && (
        <div className="question-card-admin editing">
          <QuestionForm label="Add question" onCancel={() => setAdding(false)} onSave={async (q) => {
            const err = await save('POST', `/api/admin/eligibility/sets/${setId}/questions`, q)
            if (!err) setAdding(false)
            return err
          }} />
        </div>
      )}
      <ol className="question-admin-list">
        {list.map((q) => (
          <li key={q.id} className={`question-card-admin${q.status === 'paused' ? ' paused' : ''}${editing === q.id ? ' editing' : ''}`}>
            {editing === q.id ? (
              <QuestionForm initial={q} label="Save question" onCancel={() => setEditing(null)} onSave={async (v) => {
                const err = await save('PATCH', `/api/admin/eligibility/questions/${q.id}`, v)
                if (!err) setEditing(null)
                return err
              }} />
            ) : (
              <>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="stack" style={{ gap: '0.375rem', flex: 1, minWidth: '14rem' }}>
                    <div className="row" style={{ gap: '0.375rem' }}>
                      <span className="pill primary">{q.topic}</span>
                      <span className="pill"><Icon name="clock" size="0.8rem" /> {q.seconds ?? defaultSeconds}s</span>
                      {q.status === 'paused' && <span className="pill warning">Hidden</span>}
                    </div>
                    <b>{q.text}</b>
                    <ul className="answer-list">{q.options.map((o, i) => <li key={i} className={i === q.correct ? 'correct' : undefined}>{i === q.correct && <Icon name="check" size="0.85rem" />}{o}</li>)}</ul>
                  </div>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(q.id)}>Edit</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
                      const err = await save('PATCH', `/api/admin/eligibility/questions/${q.id}`, { status: q.status === 'active' ? 'paused' : 'active' })
                      if (err) setNote({ ok: false, text: err })
                    }}>{q.status === 'active' ? 'Hide' : 'Show'}</button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
      {!list.length && <p className="small muted">No questions here yet.</p>}
    </section>
  )
}

/** Version list with restore, download and restore-from-file. Used for question sets and email flows. */
export function VersionHistory({ base, versions, current, what = 'question set' }: {
  base: string
  versions: { version: number; note: string | null; created_by: string | null; created_at: string }[]
  current?: number
  what?: string
}) {
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const latest = versions[0]?.version

  async function restore(body: unknown, label: string) {
    if (!window.confirm(`Restore ${label}? The current version stays in the history, so you can switch back at any time.`)) return
    setBusy(true)
    const r = await api('POST', `${base}/restore`, body)
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: `Restored ${label}. This was saved as a new version.` } : { ok: false, text: r.error ?? '' })
    if (r.ok) router.refresh()
  }

  return (
    <section className="card stack">
      <div className="row between">
        <div>
          <h2 className="card-title"><Icon name="refresh" className="text-primary" /> Version history &amp; backups</h2>
          <p className="card-sub">Every change to this {what} is saved. Restore any version, or download it as a backup file.{current ? ` Current: version ${current}.` : ''}</p>
        </div>
        <label className="btn btn-outline btn-sm">
          <Icon name="upload" size="0.9rem" /> Restore from a backup file
          <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (file.size > 1_000_000) { setMsg({ ok: false, text: 'That file is too large.' }); return }
            try {
              const snapshot = JSON.parse(await file.text())
              await restore({ snapshot }, `the backup file “${file.name}”`)
            } catch {
              setMsg({ ok: false, text: 'That file is not a valid backup.' })
            }
          }} />
        </label>
      </div>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role="status">{msg.text}</p>}
      <div className="table-scroll">
        <table className="admin-table compact">
          <thead><tr><th>Version</th><th>Change</th><th>By</th><th>When</th><th /></tr></thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.version}>
                <td><b>v{v.version}</b>{v.version === latest && <span className="pill success" style={{ marginLeft: '0.375rem' }}>current</span>}</td>
                <td className="small">{v.note}</td>
                <td className="small muted">{v.created_by}</td>
                <td className="small">{new Date(v.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="num">
                  <a className="btn btn-ghost btn-sm" href={`${base}/versions/${v.version}`}><Icon name="download" size="0.9rem" /> Download</a>
                  {v.version !== latest && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => restore({ version: v.version }, `version ${v.version}`)}>Restore</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
