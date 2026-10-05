'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CourseRole, RoleDomain } from '@/lib/project-roles'

export type CRProject = { id: string; title: string; description: string; tools: string[]; kind: string; domain: string | null; programs: string[]; status: 'active' | 'paused' }
type Program = { id: string; name: string; track: string }
type Audience = { id: string; label: string }

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { ok: true as const, data: j } : { ok: false as const, error: (j as { error?: string }).error ?? 'Something went wrong.' }
}

/** Admin → Courses & roles: course-wise and role-wise project lists, with roles, links and projects editable. */
export function CourseRoles({ programs, domains, links, projects, audiences }: { programs: Program[]; domains: RoleDomain[]; links: CourseRole[]; projects: CRProject[]; audiences: Audience[] }) {
  const router = useRouter()
  const [view, setView] = useState<'courses' | 'roles'>('courses')
  const [course, setCourse] = useState(programs[0]?.id ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const label = (key: string | null) => (key ? domains.find((d) => d.key === key)?.label ?? key : 'Core projects')
  const tracks = [...new Set(programs.map((p) => p.track))]

  const linked = useMemo(() => links.filter((l) => l.program_id === course), [links, course])
  const inCourse = (domain: string | null) => projects.filter((p) => p.programs.includes(course) && p.domain === domain)
  const counts = (id: string) => {
    const own = projects.filter((p) => p.programs.includes(id) && p.status === 'active')
    return { core: own.filter((p) => !p.domain).length, roles: links.filter((l) => l.program_id === id).length, total: own.length }
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setError('')
    const r = await fn()
    setBusy(false)
    if (!r.ok) { setError(r.error ?? 'Something went wrong.'); return false }
    router.refresh()
    return true
  }
  const togglePause = (p: CRProject) => run(() => send(`/api/admin/projects/${p.id}`, 'PATCH', { status: p.status === 'active' ? 'paused' : 'active' }))

  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className={`btn btn-sm ${view === 'courses' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('courses')}>Course-wise</button>
        <button type="button" className={`btn btn-sm ${view === 'roles' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('roles')}>Roles & specialisations</button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {view === 'courses' && (
        <div className="cr-grid">
          <nav className="card cr-courses" aria-label="Courses">
            {tracks.map((t) => (
              <div key={t} className="stack" style={{ gap: 4 }}>
                <span className="small muted">{t}</span>
                {programs.filter((p) => p.track === t).map((p) => {
                  const c = counts(p.id)
                  return (
                    <button key={p.id} type="button" className={`cr-course ${p.id === course ? 'on' : ''}`} onClick={() => setCourse(p.id)}>
                      <b>{p.name}</b><small>{c.total} active projects · {c.roles} roles</small>
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="stack">
            <ProjectGroup title="Core projects" note="Every learner of this course can see these." items={inCourse(null)} onToggle={togglePause} busy={busy}
              onAdd={(draft) => run(() => send('/api/admin/projects', 'POST', { ...draft, kind: draft.kind || 'module', domain: null, programs: [course], status: 'active' }))} />
            {linked.map((l) => (
              <ProjectGroup key={l.domain_key} title={label(l.domain_key)} core={l.core}
                note={l.core ? 'Core specialisation: every learner of this course sees these.' : `Shown to: ${audienceText(domains.find((d) => d.key === l.domain_key), audiences)}`}
                items={inCourse(l.domain_key)} onToggle={togglePause} busy={busy}
                onAdd={(draft) => run(() => send('/api/admin/projects', 'POST', { ...draft, kind: 'domain', domain: l.domain_key, programs: [course], status: 'active' }))}
                onUnlink={() => { if (window.confirm(`Stop offering ${label(l.domain_key)} projects in this course? (The projects stay in the library.)`)) void run(() => send('/api/admin/course-roles', 'DELETE', { program: course, domain: l.domain_key })) }}
                onCore={(core) => run(() => send('/api/admin/course-roles', 'POST', { program: course, domain: l.domain_key, core }))} />
            ))}
            <LinkRole domains={domains.filter((d) => !linked.some((l) => l.domain_key === d.key))} busy={busy}
              onLink={(domain, core) => run(() => send('/api/admin/course-roles', 'POST', { program: course, domain, core }))} />
          </div>
        </div>
      )}

      {view === 'roles' && (
        <RolesView domains={domains} links={links} projects={projects} programs={programs} audiences={audiences} busy={busy}
          onAdd={(role) => run(() => send('/api/admin/roles', 'POST', role))}
          onSave={(key, patch) => run(() => send(`/api/admin/roles/${key}`, 'PATCH', patch))}
          onDelete={(key) => { if (window.confirm('Delete this role? (Only possible when no project uses it.)')) void run(() => send(`/api/admin/roles/${key}`, 'DELETE')) }} />
      )}
    </div>
  )
}

function audienceText(d: RoleDomain | undefined, audiences: Audience[]) {
  if (!d) return '—'
  const who = d.learner_roles.map((id) => audiences.find((a) => a.id === id)?.label ?? id)
  return [...who, ...(d.keywords.length ? [`typed roles like “${d.keywords.slice(0, 3).join('”, “')}”`] : [])].join(', ') || 'no one yet (edit the role)'
}

type Draft = { title: string; description: string; tools: string; kind: string }

function ProjectGroup({ title, note, items, core, busy, onToggle, onAdd, onUnlink, onCore }: {
  title: string; note: string; items: CRProject[]; core?: boolean; busy: boolean
  onToggle: (p: CRProject) => void
  onAdd: (d: { title: string; description: string; tools: string[]; kind: string }) => Promise<boolean>
  onUnlink?: () => void
  onCore?: (core: boolean) => void
}) {
  const [adding, setAdding] = useState(false)
  const [d, setD] = useState<Draft>({ title: '', description: '', tools: '', kind: 'domain' })
  const active = items.filter((p) => p.status === 'active').length
  return (
    <section className="card stack">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 className="card-title">{title} <span className="pill">{active} active{items.length > active ? ` · ${items.length - active} paused` : ''}</span>{core && <span className="pill primary" style={{ marginLeft: 6 }}>Core</span>}</h2>
          <p className="small muted">{note}{active < 7 && <b className="text-danger"> · Fewer than 7 projects: add more.</b>}</p>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Add project'}</button>
          {onCore && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onCore(!core)}>{core ? 'Make optional' : 'Make core'}</button>}
          {onUnlink && <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={busy} onClick={onUnlink}>Unlink role</button>}
        </div>
      </div>
      {adding && (
        <div className="stack cr-add">
          <input className="input" placeholder="Project title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <textarea className="textarea" rows={2} placeholder="What the learner builds, and the result they can show" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          <input className="input" placeholder="Tools, comma separated (e.g. ChatGPT, Make, Vercel)" value={d.tools} onChange={(e) => setD({ ...d, tools: e.target.value })} />
          <div className="row" style={{ gap: 8 }}>
            <select className="select" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })}>
              <option value="domain">Role project</option><option value="capstone">Capstone</option><option value="module">Module project</option>
            </select>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || d.title.trim().length < 3} onClick={async () => {
              if (await onAdd({ title: d.title, description: d.description, tools: d.tools.split(',').map((t) => t.trim()).filter(Boolean), kind: d.kind })) { setD({ title: '', description: '', tools: '', kind: 'domain' }); setAdding(false) }
            }}>Save project</button>
          </div>
        </div>
      )}
      {items.length ? (
        <ul className="cr-projects">
          {items.map((p) => (
            <li key={p.id} className={p.status === 'paused' ? 'paused' : ''}>
              <div><b>{p.title}</b><small>{p.description}</small>{p.tools.length > 0 && <small className="muted">{p.tools.slice(0, 6).join(' · ')}</small>}</div>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onToggle(p)}>{p.status === 'active' ? 'Pause' : 'Resume'}</button>
            </li>
          ))}
        </ul>
      ) : <p className="small muted">No projects yet. Add the first one.</p>}
    </section>
  )
}

function LinkRole({ domains, busy, onLink }: { domains: RoleDomain[]; busy: boolean; onLink: (domain: string, core: boolean) => void }) {
  const [domain, setDomain] = useState('')
  const [core, setCore] = useState(false)
  if (!domains.length) return null
  return (
    <section className="card row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <b>Offer another role in this course</b>
      <select className="select" value={domain} onChange={(e) => setDomain(e.target.value)}>
        <option value="">Pick a role or specialisation…</option>
        {domains.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
      </select>
      <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={core} onChange={(e) => setCore(e.target.checked)} /> Core (every learner)</label>
      <button type="button" className="btn btn-primary btn-sm" disabled={busy || !domain} onClick={() => { onLink(domain, core); setDomain(''); setCore(false) }}>Link to course</button>
    </section>
  )
}

function RolesView({ domains, links, projects, programs, audiences, busy, onAdd, onSave, onDelete }: {
  domains: RoleDomain[]; links: CourseRole[]; projects: CRProject[]; programs: Program[]; audiences: Audience[]; busy: boolean
  onAdd: (r: { label: string; kind: string; learnerRoles: string[]; keywords: string; programs: string[] }) => Promise<boolean>
  onSave: (key: string, patch: Record<string, unknown>) => void
  onDelete: (key: string) => void
}) {
  const [draft, setDraft] = useState({ label: '', kind: 'role', learnerRoles: [] as string[], keywords: '', programs: [] as string[] })
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState({ label: '', learnerRoles: [] as string[], keywords: '' })
  const name = (id: string) => programs.find((p) => p.id === id)?.name ?? id
  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="card-title">Add a role or specialisation</h2>
        <p className="small muted">For a role learners have but no projects cover yet (e.g. “Video editing”). Pick who it’s for, words that match a typed role, and the courses that should offer it; then add its projects course by course.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Name, e.g. Video editing" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <select className="select" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}><option value="role">Role</option><option value="industry">Industry</option></select>
          <input className="input" style={{ minWidth: 260 }} placeholder="Matching words, comma separated (video, editor, youtube)" value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} />
        </div>
        <Picker title="Shown to learners whose role is" options={audiences} value={draft.learnerRoles} onChange={(v) => setDraft({ ...draft, learnerRoles: v })} />
        <Picker title="Offer it in these courses" options={programs.map((p) => ({ id: p.id, label: p.name }))} value={draft.programs} onChange={(v) => setDraft({ ...draft, programs: v })} />
        <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy || draft.label.trim().length < 2}
          onClick={async () => { if (await onAdd(draft)) setDraft({ label: '', kind: 'role', learnerRoles: [], keywords: '', programs: [] }) }}>Add role</button>
      </section>
      <section className="card stack">
        <h2 className="card-title">{domains.length} roles & specialisations</h2>
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>Role</th><th>Shown to</th><th>Courses</th><th>Projects</th><th /></tr></thead>
            <tbody>
              {domains.map((d) => {
                const courses = links.filter((l) => l.domain_key === d.key)
                const n = projects.filter((p) => p.domain === d.key)
                return (
                  <tr key={d.key}>
                    <td><b>{d.label}</b><br /><small className="muted">{d.kind}</small></td>
                    <td>
                      {editing === d.key ? (
                        <div className="stack" style={{ gap: 6 }}>
                          <input className="input" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
                          <Picker title="Learner roles" options={audiences} value={edit.learnerRoles} onChange={(v) => setEdit({ ...edit, learnerRoles: v })} />
                          <input className="input" value={edit.keywords} onChange={(e) => setEdit({ ...edit, keywords: e.target.value })} placeholder="Matching words" />
                          <div className="row" style={{ gap: 6 }}>
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => { onSave(d.key, edit); setEditing(null) }}>Save</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : <small>{audienceText(d, audiences)}</small>}
                    </td>
                    <td><small>{courses.map((l) => `${name(l.program_id)}${l.core ? ' (core)' : ''}`).join('; ') || '—'}</small></td>
                    <td>{n.filter((p) => p.status === 'active').length}{n.some((p) => p.status === 'paused') ? ` (+${n.filter((p) => p.status === 'paused').length} paused)` : ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(d.key); setEdit({ label: d.label, learnerRoles: d.learner_roles, keywords: d.keywords.join(', ') }) }}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={busy || n.length > 0} title={n.length ? 'Projects use this role' : 'Delete'} onClick={() => onDelete(d.key)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Picker({ title, options, value, onChange }: { title: string; options: Audience[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <details className="cr-picker">
      <summary>{title}: {value.length ? options.filter((o) => value.includes(o.id)).map((o) => o.label).join(', ') : 'none yet'}</summary>
      <div className="cr-picker-list">
        {options.map((o) => (
          <label key={o.id} className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} /> {o.label}
          </label>
        ))}
      </div>
    </details>
  )
}
