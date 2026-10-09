'use client'

import { useState } from 'react'
import { getJson, postJson } from '@/lib/client'
import { Msg, useAction } from './useAction'

type Key = { id: string; name: string; prefix: string; scopes: string[]; created_at: string; last_used_at: string | null; revoked_at: string | null }
type Endpoint = { id: string; url: string; description: string | null; events: string[]; active: boolean; created_at: string; last_status: number | null; last_ok: boolean | null; last_at: string | null }
type Delivery = { id: string; endpoint: string; event: string; status: number | null; ok: boolean; duration_ms: number | null; created_at: string }
type Event = { id: string; label: string }

const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—')

/** Shown once after creating a key or secret, with a copy button. */
function Secret({ label, value, onDone }: { label: string; value: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="crm-secret" role="status">
      <b>{label}</b>
      <code>{value}</code>
      <button type="button" className="crm-btn ghost" onClick={() => { void navigator.clipboard?.writeText(value).then(() => setCopied(true)) }}>{copied ? 'Copied' : 'Copy'}</button>
      <button type="button" className="crm-btn ghost" onClick={onDone}>I’ve saved it</button>
      <span className="crm-faint" style={{ flexBasis: '100%' }}>This is the only time it is shown. Store it in the other tool’s secret settings, never in code.</span>
    </div>
  )
}

export function ApiKeys({ keys }: { keys: Key[] }) {
  const create = useAction('/api/crm/dev/keys')
  const [name, setName] = useState('')
  const [write, setWrite] = useState(false)
  const [shown, setShown] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function revoke(k: Key) {
    if (!window.confirm(`Revoke “${k.name}”? Tools using it stop working at once.`)) return
    const r = await postJson(`/api/crm/dev/keys/${k.id}`, {}, 'DELETE')
    setMsg(r.ok ? { ok: true, text: String(r.data.message) } : { ok: false, text: r.error })
    if (r.ok) window.location.reload()
  }
  return (
    <section className="crm-panel">
      <div className="crm-panel-head"><h2>API keys</h2><span className="crm-faint">For tools that read or send leads</span></div>
      <form className="crm-form-row" onSubmit={async (e) => {
        e.preventDefault()
        const r = await create.run({ name, scopes: write ? ['read', 'write'] : ['read'] })
        if (r.ok) { setShown(String(r.data.key)); setName('') }
      }}>
        <input className="input" placeholder="Name, e.g. Main Sales CRM" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} aria-label="Key name" />
        <label className="small row" style={{ gap: '0.3rem' }}><input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} /> Can write</label>
        <button className="crm-btn" disabled={create.busy || name.trim().length < 2}>{create.busy ? 'Creating…' : 'Create key'}</button>
      </form>
      {shown && <Secret label="New API key" value={shown} onDone={() => setShown('')} />}
      <Msg msg={create.msg?.ok ? null : create.msg} />
      <Msg msg={msg} />
      {keys.length ? (
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Last used</th><th>Created</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={k.revoked_at ? { opacity: 0.5 } : undefined}>
                  <td><b>{k.name}</b>{k.revoked_at && <div className="small muted">Revoked {when(k.revoked_at)}</div>}</td>
                  <td><code className="small">{k.prefix}…</code></td>
                  <td className="small">{k.scopes.join(' + ')}</td>
                  <td className="small">{when(k.last_used_at)}</td>
                  <td className="small">{when(k.created_at)}</td>
                  <td>{!k.revoked_at && <button type="button" className="crm-btn danger" onClick={() => void revoke(k)}>Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="crm-faint">No keys yet.</p>}
    </section>
  )
}

function EventPicker({ events, value, onChange }: { events: Event[]; value: string[]; onChange: (v: string[]) => void }) {
  const all = value.includes('*')
  return (
    <div className="crm-checks">
      <label><input type="checkbox" checked={all} onChange={(e) => onChange(e.target.checked ? ['*'] : [])} /> <b>All events</b></label>
      {events.map((ev) => (
        <label key={ev.id} title={ev.label}><input type="checkbox" disabled={all} checked={all || value.includes(ev.id)}
          onChange={(e) => onChange(e.target.checked ? [...value, ev.id] : value.filter((x) => x !== ev.id))} /> <code>{ev.id}</code></label>
      ))}
    </div>
  )
}

export function Webhooks({ endpoints, events }: { endpoints: Endpoint[]; events: Event[] }) {
  const add = useAction('/api/crm/dev/webhooks')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [picked, setPicked] = useState<string[]>(['*'])
  const [shown, setShown] = useState<{ label: string; value: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function act(ep: Endpoint, action: string) {
    if (action === 'delete' && !window.confirm(`Remove ${ep.url} and its delivery log?`)) return
    if (action === 'rotate' && !window.confirm('Make a new signing secret? The current one stops working now.')) return
    setBusy(`${ep.id}:${action}`)
    const r = action === 'delete' ? await postJson(`/api/crm/dev/webhooks/${ep.id}`, {}, 'DELETE') : await postJson(`/api/crm/dev/webhooks/${ep.id}`, { action })
    setBusy('')
    setMsg(r.ok ? { ok: r.data.delivered !== false, text: String(r.data.message) } : { ok: false, text: r.error })
    if (r.ok && r.data.secret) setShown({ label: 'New signing secret', value: String(r.data.secret) })
    else if (r.ok && action !== 'test') window.location.reload()
  }

  return (
    <section className="crm-panel">
      <div className="crm-panel-head"><h2>Webhooks</h2><span className="crm-faint">We POST signed JSON to these URLs when something happens</span></div>
      <form className="stack" style={{ gap: '0.6rem' }} onSubmit={async (e) => {
        e.preventDefault()
        const r = await add.run({ url, description, events: picked }, { refresh: false })
        if (r.ok) { setShown({ label: 'Signing secret', value: String(r.data.secret) }); setUrl(''); setDescription('') }
      }}>
        <div className="crm-form-row">
          <input className="input" type="url" placeholder="https://crm.example.com/hooks/learnbay" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Endpoint URL" />
          <input className="input" placeholder="What it is (optional)" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
        </div>
        <EventPicker events={events} value={picked} onChange={setPicked} />
        <button className="crm-btn" style={{ alignSelf: 'flex-start' }} disabled={add.busy || !url.startsWith('https://') || !picked.length}>{add.busy ? 'Adding…' : 'Add endpoint'}</button>
      </form>
      {shown && <Secret label={shown.label} value={shown.value} onDone={() => { setShown(null); window.location.reload() }} />}
      <Msg msg={add.msg?.ok ? null : add.msg} />
      <Msg msg={msg} />
      {endpoints.map((ep) => (
        <div key={ep.id} className="crm-endpoint" style={ep.active ? undefined : { opacity: 0.65 }}>
          <div className="row between" style={{ gap: '0.5rem' }}>
            <code className="small">{ep.url}</code>
            <span className={`pill ${ep.active ? 'success' : ''}`}>{ep.active ? 'Live' : 'Paused'}</span>
          </div>
          {ep.description && <span className="small">{ep.description}</span>}
          <span className="crm-faint">Events: {ep.events.includes('*') ? 'all' : ep.events.join(', ')}</span>
          <span className="crm-faint">Last delivery: {ep.last_at ? `${ep.last_ok ? '✓' : '✗'} ${ep.last_status ?? 'no answer'} · ${when(ep.last_at)}` : 'none yet'}</span>
          <div className="row" style={{ gap: '0.4rem' }}>
            <button type="button" className="crm-btn ghost" disabled={Boolean(busy)} onClick={() => void act(ep, 'test')}>{busy === `${ep.id}:test` ? 'Sending…' : 'Send test'}</button>
            <button type="button" className="crm-btn ghost" disabled={Boolean(busy)} onClick={() => void act(ep, ep.active ? 'pause' : 'resume')}>{ep.active ? 'Pause' : 'Resume'}</button>
            <button type="button" className="crm-btn ghost" disabled={Boolean(busy)} onClick={() => void act(ep, 'rotate')}>New secret</button>
            <button type="button" className="crm-btn danger" disabled={Boolean(busy)} onClick={() => void act(ep, 'delete')}>Remove</button>
          </div>
        </div>
      ))}
      {!endpoints.length && <p className="crm-faint">No endpoints yet. The main CRM can also be set with CRM_WEBHOOK_URL in the environment.</p>}
    </section>
  )
}

export function Deliveries({ rows }: { rows: Delivery[] }) {
  const [open, setOpen] = useState<{ id: string; text: string } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  async function view(id: string) {
    if (open?.id === id) { setOpen(null); return }
    const r = await getJson(`/api/crm/dev/deliveries/${id}`)
    setOpen({ id, text: r.ok ? `${JSON.stringify(r.data.payload, null, 2)}${r.data.response ? `\n\n— Receiver answered —\n${String(r.data.response)}` : ''}` : r.error })
  }
  async function again(id: string) {
    setBusy(id)
    const r = await postJson(`/api/crm/dev/deliveries/${id}`, {})
    setBusy('')
    setMsg(r.ok ? { ok: r.data.delivered !== false, text: String(r.data.message) } : { ok: false, text: r.error })
  }
  return (
    <section className="crm-panel">
      <div className="crm-panel-head"><h2>Delivery log</h2><span className="crm-faint">Last 40 webhook calls</span></div>
      <Msg msg={msg} />
      {rows.length ? (
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>When</th><th>Event</th><th>Endpoint</th><th>Result</th><th className="num">ms</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="small">{when(d.created_at)}</td>
                  <td><code className="small">{d.event}</code></td>
                  <td className="small" style={{ maxWidth: '16rem', overflowWrap: 'anywhere' }}>{d.endpoint}</td>
                  <td>{d.ok ? <span className="pill success">{d.status}</span> : <span className="pill danger">{d.status ?? 'failed'}</span>}</td>
                  <td className="num small">{d.duration_ms ?? '—'}</td>
                  <td className="row" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                    <button type="button" className="crm-btn ghost" onClick={() => void view(d.id)}>{open?.id === d.id ? 'Hide' : 'View'}</button>
                    <button type="button" className="crm-btn ghost" disabled={busy === d.id} onClick={() => void again(d.id)}>{busy === d.id ? '…' : 'Resend'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="crm-faint">Nothing sent yet.</p>}
      {open && <pre className="crm-code">{open.text}</pre>}
    </section>
  )
}
