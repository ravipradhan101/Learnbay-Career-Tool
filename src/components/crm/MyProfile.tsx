'use client'

import { useState } from 'react'
import { Msg, useAction } from './useAction'

/** Each team member's own details, including the Google Meet room used when a meeting has no generated link. */
export function MyProfile({ name, phone, meetUrl }: { name: string; phone: string; meetUrl: string }) {
  const [f, setF] = useState({ name, phone, meetUrl })
  const { run, busy, msg } = useAction('/api/crm/me', 'PATCH')
  return (
    <form className="crm-form-grid" onSubmit={(e) => { e.preventDefault(); void run(f) }}>
      <div className="field"><label className="label" htmlFor="me-name">Full name</label><input id="me-name" className="input" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="field"><label className="label" htmlFor="me-phone">Phone</label><input id="me-phone" className="input" maxLength={20} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div className="field">
        <label className="label" htmlFor="me-meet">My Google Meet room</label>
        <input id="me-meet" className="input" placeholder="https://meet.google.com/abc-defg-hij" value={f.meetUrl} onChange={(e) => setF({ ...f, meetUrl: e.target.value })} />
        <span className="help-note">Used for your video calls when a fresh Meet link can’t be created automatically.</span>
      </div>
      <div className="field" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? 'Saving…' : 'Save my profile'}</button>
        <Msg msg={msg} />
      </div>
    </form>
  )
}
