'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AdminCompany = { id: string; name: string; category: string; alumni: boolean; featured: boolean }

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { ok: true as const, data: j } : { ok: false as const, error: (j as { error?: string }).error ?? 'Something went wrong.' }
}

/**
 * Admin → Companies: the list learners browse in the chat. "Alumni" = Learnbay publishes that its alumni work there
 * (only these are described that way); "Featured" = one of the ~15 names shown first on the card.
 */
export function CompanyAdmin({ companies, categories }: { companies: AdminCompany[]; categories: readonly string[] }) {
  const router = useRouter()
  const [f, setF] = useState({ q: '', category: '', kind: '' })
  const [lines, setLines] = useState('')
  const [category, setCategory] = useState<string>(categories[0])
  const [alumni, setAlumni] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const shown = useMemo(() => companies.filter((c) => {
    if (f.q && !c.name.toLowerCase().includes(f.q.toLowerCase())) return false
    if (f.category && c.category !== f.category) return false
    if (f.kind === 'alumni' && !c.alumni) return false
    if (f.kind === 'market' && c.alumni) return false
    if (f.kind === 'featured' && !c.featured) return false
    return true
  }), [companies, f])
  const counts = { all: companies.length, alumni: companies.filter((c) => c.alumni).length, featured: companies.filter((c) => c.featured).length }

  async function add() {
    setBusy(true); setError(''); setMsg('')
    const r = await send('/api/admin/companies', 'POST', { lines, category, alumni })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    const d = r.data as { added: number; skipped: number }
    setMsg(`${d.added} added${d.skipped ? `, ${d.skipped} already in the list` : ''}.`)
    setLines('')
    router.refresh()
  }
  async function patch(id: string, body: Record<string, unknown>) {
    setError('')
    const r = await send(`/api/admin/companies/${id}`, 'PATCH', body)
    if (!r.ok) return setError(r.error)
    router.refresh()
  }
  async function remove(c: AdminCompany) {
    if (!window.confirm(`Remove ${c.name} from the list?`)) return
    const r = await send(`/api/admin/companies/${c.id}`, 'DELETE')
    if (!r.ok) return setError(r.error)
    router.refresh()
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="card-title">Add companies</h2>
        <p className="small muted">One per line. Add the category after a bar to override the default, e.g. <code>Microsoft | Big Tech</code>. Names already in the list are skipped.</p>
        <textarea className="textarea" rows={5} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'Adobe | Big Tech\nSwiggy | Product & startups\nHDFC Bank | Banking & finance'} />
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label className="field"><span className="label">Default category</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={alumni} onChange={(e) => setAlumni(e.target.checked)} /> Learnbay alumni work at these companies (tick only if Learnbay can show this)
          </label>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !lines.trim()} onClick={add}>{busy ? 'Adding…' : 'Add to the list'}</button>
        </div>
        {msg && <p className="small">{msg}</p>}
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h2 className="card-title">{counts.all} companies · {counts.alumni} alumni employers · {counts.featured} featured on the card</h2>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input className="input" placeholder="Search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="">All companies</option><option value="alumni">Alumni employers</option><option value="market">Hiring for these roles</option><option value="featured">Featured</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>Company</th><th>Category</th><th>Alumni work here</th><th>Featured</th><th /></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <select className="select" value={c.category} onChange={(e) => void patch(c.id, { category: e.target.value })}>{categories.map((x) => <option key={x}>{x}</option>)}</select>
                  </td>
                  <td><input type="checkbox" checked={c.alumni} aria-label={`Learnbay alumni work at ${c.name}`} onChange={(e) => void patch(c.id, { alumni: e.target.checked })} /></td>
                  <td><input type="checkbox" checked={c.featured} aria-label={`Feature ${c.name} on the card`} onChange={(e) => void patch(c.id, { featured: e.target.checked })} /></td>
                  <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => void remove(c)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
