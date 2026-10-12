'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Msg, useAction } from './useAction'
import { CountryPicker } from '../CountryPicker'

type Opt = { id: string; label: string }

/**
 * New lead form. "Give to" only lists people the server will accept: an ISM only themselves; an associate themselves
 * and their ISMs; a manager themselves, their associates and ISMs; the admin anyone.
 */
export function NewLeadButton({ assignable }: { assignable: Opt[]; countries?: { code: string; label: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', email: '', phoneCountry: '+91', phone: '', assignTo: assignable[0]?.id ?? '', note: '' })
  const { run, busy, msg, setMsg } = useAction('/api/crm/leads')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => { setOpen(true); setMsg(null) }}>+ New lead</button>
      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <form className="modal" aria-label="New lead" onSubmit={async (e) => {
            e.preventDefault()
            const r = await run(f, { refresh: false })
            if (r.ok && typeof r.data.id === 'string') router.push(`/admin/crm/leads/${r.data.id}?created=1`)
            else if (!r.ok && typeof r.data.id === 'string') setTimeout(() => router.push(`/admin/crm/leads/${r.data.id}`), 1500)
          }}>
            <h2>New lead</h2>
            <button type="button" className="btn btn-ghost btn-sm modal-close" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            <p className="small muted">We check the CRM first: if this person already has an owner there, the lead goes to them.</p>
            <div className="field"><label className="label" htmlFor="nl-name">Full name</label><input id="nl-name" className="input" required maxLength={80} value={f.name} onChange={set('name')} /></div>
            <div className="field"><label className="label" htmlFor="nl-email">Email</label><input id="nl-email" className="input" type="email" required maxLength={254} value={f.email} onChange={set('email')} /></div>
            <div className="field">
              <label className="label" htmlFor="nl-phone">Phone</label>
              <div className="row" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                <div style={{ width: '7.5rem', flex: 'none' }}><CountryPicker value={f.phoneCountry} onChange={(code) => setF({ ...f, phoneCountry: code })} /></div>
                <input id="nl-phone" className="input" inputMode="tel" required maxLength={15} value={f.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="nl-to">Give to</label>
              <select id="nl-to" className="select" value={f.assignTo} onChange={set('assignTo')} disabled={assignable.length < 2}>{assignable.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            </div>
            <div className="field"><label className="label" htmlFor="nl-note">Note (optional)</label><textarea id="nl-note" className="textarea" rows={2} maxLength={2000} value={f.note} onChange={set('note')} /></div>
            <Msg msg={msg} />
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save lead'}</button>
          </form>
        </div>
      )}
    </>
  )
}
