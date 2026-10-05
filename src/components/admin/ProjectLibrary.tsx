'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AdminProject = {
  id: string; title: string; description: string; tools: string[]; kind: 'module' | 'capstone' | 'domain'
  module: string | null; domain: string | null; programs: string[]; source: 'brochure' | 'generated' | 'admin'
  source_ref: string | null; status: 'active' | 'paused'
}
type ProgramOpt = { id: string; name: string; track: string }

const SOURCE: Record<string, { label: string; tone: string }> = {
  brochure: { label: 'From brochure', tone: 'primary' },
  generated: { label: 'Written for the library: review', tone: 'warning' },
  admin: { label: 'Added by team', tone: '' },
}
const KIND: Record<string, string> = { module: 'Module project', capstone: 'Capstone', domain: 'Domain project' }

type Draft = { title: string; description: string; tools: string; kind: string; module: string; domain: string; programs: string[]; status: string }
const empty: Draft = { title: '', description: '', tools: '', kind: 'module', module: '', domain: '', programs: [], status: 'active' }

/** Admin → Projects: filter by track, program and domain; add, edit, pause and delete projects. */
export function ProjectLibrary({ projects, programs, domains }: { projects: AdminProject[]; programs: ProgramOpt[]; domains: Record<string, string> }) {
  const router = useRouter()
  const tracks = [...new Set(programs.map((p) => p.track))]
  const [f, setF] = useState({ track: '', program: '', domain: '', kind: '', source: '', status: '', q: '' })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? id

  const shown = useMemo(() => projects.filter((p) => {
    if (f.track && !p.programs.some((id) => programs.find((x) => x.id === id)?.track === f.track)) return false
    if (f.program && !p.programs.includes(f.program)) return false
    if (f.domain === 'none' ? p.domain : f.domain && p.domain !== f.domain) return false
    if (f.kind && p.kind !== f.kind) return false
    if (f.source && p.source !== f.source) return false
    if (f.status && p.status !== f.status) return false
    if (f.q && !`${p.title} ${p.description} ${p.tools.join(' ')}`.toLowerCase().includes(f.q.toLowerCase())) return false
    return true
  }), [projects, programs, f])

  // How many active projects each program has (and per domain), so thin spots are easy to see.
  const counts = useMemo(() => programs.map((p) => {
    const own = projects.filter((x) => x.status === 'active' && x.programs.includes(p.id))
    return { ...p, core: own.filter((x) => !x.domain).length, domain: own.filter((x) => x.domain).length }
  }), [projects, programs])

  function startEdit(p?: AdminProject) {
    setError('')
    setEditing(p ? p.id : 'new')
    setDraft(p ? { title: p.title, description: p.description, tools: p.tools.join(', '), kind: p.kind, module: p.module ?? '', domain: p.domain ?? '', programs: p.programs, status: p.status }
      : { ...empty, programs: f.program ? [f.program] : [] })
  }

  async function save() {
    setBusy(true)
    setError('')
    const payload = { ...draft, tools: draft.tools.split(',').map((t) => t.trim()).filter(Boolean), domain: draft.domain || null }
    const r = await fetch(editing === 'new' ? '/api/admin/projects' : `/api/admin/projects/${editing}`, {
      method: editing === 'new' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload),
    }).catch(() => null)
    const data = r ? await r.json().catch(() => ({})) : {}
    setBusy(false)
    if (!r?.ok) { setError((data as { error?: string }).error ?? 'Could not save. Please try again.'); return }
    setEditing(null)
    router.refresh()
  }

  async function patch(id: string, body: object, method = 'PATCH') {
    setBusy(true)
    await fetch(`/api/admin/projects/${id}`, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: method === 'DELETE' ? undefined : JSON.stringify(body) }).catch(() => null)
    setBusy(false)
    setConfirmDelete(null)
    router.refresh()
  }

  const form = (
    <div className="card stack" style={{ borderColor: '#c7d2fe' }}>
      <h3 className="card-title">{editing === 'new' ? 'Add a project' : 'Edit project'}</h3>
      <label className="field"><span className="label">Title</span><input className="input" value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="field"><span className="label">Description (what they build and the outcome)</span><textarea className="textarea" rows={3} maxLength={600} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <label className="field"><span className="label">Tools (comma separated)</span><input className="input" value={draft.tools} onChange={(e) => setDraft({ ...draft, tools: e.target.value })} placeholder="Python, LangChain, FAISS" /></label>
      <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <label className="field"><span className="label">Type</span>
          <select className="select" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
            <option value="module">Module project</option><option value="capstone">Capstone</option><option value="domain">Domain project</option>
          </select></label>
        <label className="field"><span className="label">Domain</span>
          <select className="select" value={draft.domain} onChange={(e) => setDraft({ ...draft, domain: e.target.value })}>
            <option value="">None (all learners)</option>
            {Object.entries(domains).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
        <label className="field"><span className="label">Module (optional)</span><input className="input" value={draft.module} onChange={(e) => setDraft({ ...draft, module: e.target.value })} /></label>
        <label className="field"><span className="label">Status</span>
          <select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="active">Active (shown to learners)</option><option value="paused">Paused (hidden)</option>
          </select></label>
      </div>
      <fieldset className="field" style={{ border: 'none', padding: 0 }}>
        <span className="label">Programs (shown to learners of these programs)</span>
        {tracks.map((t) => (
          <div key={t} style={{ marginTop: '0.35rem' }}>
            <b className="small">{t}</b>
            <div className="row" style={{ flexWrap: 'wrap', gap: '0.35rem 1rem', marginTop: '0.2rem' }}>
              {programs.filter((p) => p.track === t).map((p) => (
                <label key={p.id} className="small" style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={draft.programs.includes(p.id)} onChange={(e) => setDraft({ ...draft, programs: e.target.checked ? [...draft.programs, p.id] : draft.programs.filter((x) => x !== p.id) })} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      {error && <p className="form-error">{error}</p>}
      <div className="row" style={{ gap: '0.5rem' }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save project'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="card-title">Projects per program</h2>
        <p className="small muted">Active projects each program shows (general ones, and domain-specialisation ones matched to the learner&apos;s industry). Aim for at least 7–9 each. Click a program to filter.</p>
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>Track</th><th>Program</th><th className="num">General</th><th className="num">Domain</th></tr></thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer', background: f.program === c.id ? '#eef2ff' : undefined }} onClick={() => setF({ ...f, program: f.program === c.id ? '' : c.id })}>
                  <td>{c.track}</td><td><b>{c.name}</b></td>
                  <td className="num" style={{ color: c.core < 7 ? '#b45309' : undefined }}>{c.core}</td>
                  <td className="num">{c.domain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="card-title">Library · {shown.length} of {projects.length}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => startEdit()}>+ Add project</button>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <select className="select" value={f.track} onChange={(e) => setF({ ...f, track: e.target.value, program: '' })} aria-label="Track">
            <option value="">All tracks</option>{tracks.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="select" value={f.program} onChange={(e) => setF({ ...f, program: e.target.value })} aria-label="Program">
            <option value="">All programs</option>
            {programs.filter((p) => !f.track || p.track === f.track).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} aria-label="Domain">
            <option value="">All domains</option><option value="none">No domain (general)</option>
            {Object.entries(domains).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select className="select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label="Type">
            <option value="">All types</option><option value="module">Module projects</option><option value="capstone">Capstones</option><option value="domain">Domain projects</option>
          </select>
          <select className="select" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} aria-label="Source">
            <option value="">Any source</option><option value="brochure">From brochure</option><option value="generated">Written for the library</option><option value="admin">Added by team</option>
          </select>
          <select className="select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status">
            <option value="">Active and paused</option><option value="active">Active</option><option value="paused">Paused</option>
          </select>
          <input className="input" placeholder="Search title, tools…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} style={{ minWidth: 200 }} />
        </div>
        {editing === 'new' && form}
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>Project</th><th>Type</th><th>Programs</th><th>Source</th><th></th></tr></thead>
            <tbody>
              {shown.map((p) => editing === p.id ? (
                <tr key={p.id}><td colSpan={5}>{form}</td></tr>
              ) : (
                <tr key={p.id} style={{ opacity: p.status === 'paused' ? 0.55 : 1 }}>
                  <td style={{ minWidth: 280 }}>
                    <b>{p.title}</b>
                    {p.description && <div className="small muted">{p.description}</div>}
                    {p.tools.length > 0 && <div className="small">{p.tools.join(' · ')}</div>}
                  </td>
                  <td className="small">{KIND[p.kind]}{p.domain ? <><br /><span className="pill">{domains[p.domain] ?? p.domain}</span></> : null}{p.module ? <div className="muted">{p.module}</div> : null}</td>
                  <td className="small" style={{ minWidth: 180 }}>{p.programs.map(programName).join(', ')}</td>
                  <td className="small"><span className={`pill ${SOURCE[p.source]?.tone ?? ''}`}>{SOURCE[p.source]?.label ?? p.source}</span>{p.source_ref ? <div className="muted">{p.source_ref}</div> : null}{p.status === 'paused' ? <div><b>Paused</b></div> : null}</td>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Edit</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => patch(p.id, { status: p.status === 'active' ? 'paused' : 'active' })}>{p.status === 'active' ? 'Pause' : 'Resume'}</button>
                    {confirmDelete === p.id
                      ? <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={() => patch(p.id, {}, 'DELETE')}>Confirm delete</button>
                      : <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setConfirmDelete(p.id)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <p className="small muted">No projects match these filters.</p>}
      </section>
    </div>
  )
}
