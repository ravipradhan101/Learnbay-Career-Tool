'use client'

import { useState } from 'react'
import { ROLE_LABEL, creatableRoles, type StaffRole } from '@/lib/crm/roles'
import { Msg, useAction } from './useAction'

export type Member = {
  id: string; name: string | null; email: string; phone: string | null; role: StaffRole; team: string | null
  manager_id: string | null; associate_id: string | null; active: boolean; in_rotation: boolean
}
type Me = { id: string; role: StaffRole }

const nameOf = (m: Member) => m.name || m.email

/** Where someone sits: "manager:<id>", "associate:<id>" or "" (independent / unplaced). */
function placeOf(m: Pick<Member, 'manager_id' | 'associate_id'>) {
  return m.associate_id ? `associate:${m.associate_id}` : m.manager_id ? `manager:${m.manager_id}` : ''
}
function placeBody(place: string) {
  const [kind, id] = place.split(':')
  return { managerId: kind === 'manager' ? id : null, associateId: kind === 'associate' ? id : null }
}

function PlaceSelect({ me, role, value, onChange, people }: { me: Me; role: StaffRole; value: string; onChange: (v: string) => void; people: Member[] }) {
  if (role === 'manager') return null
  const managers = people.filter((p) => p.role === 'manager' && p.active)
  const associates = people.filter((p) => p.role === 'associate' && p.active)
  return (
    <div className="field">
      <label className="label" htmlFor="tm-place">{role === 'associate' ? 'Manager' : 'Works under'}</label>
      <select id="tm-place" className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {role === 'associate' && me.role === 'admin' && <option value="">Independent associate ★</option>}
        {role === 'ism' && me.role === 'admin' && <option value="">Nobody yet (admin’s pool)</option>}
        {(me.role === 'admin' ? managers : managers.filter((m) => m.id === me.id)).map((m) => <option key={m.id} value={`manager:${m.id}`}>{role === 'ism' ? 'Directly under manager ' : ''}{nameOf(m)}{m.team ? ` (${m.team})` : ''}</option>)}
        {role === 'ism' && associates.map((a) => <option key={a.id} value={`associate:${a.id}`}>Associate {nameOf(a)}</option>)}
      </select>
    </div>
  )
}

export function AddStaff({ me, people }: { me: Me; people: Member[] }) {
  const roles = creatableRoles(me.role)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', email: '', phone: '', role: roles[roles.length - 1] ?? 'ism', team: '', place: me.role === 'manager' ? `manager:${me.id}` : '' })
  const { run, busy, msg, setMsg } = useAction('/api/crm/staff')
  if (!roles.length) return null
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => { setOpen(true); setMsg(null) }}>+ Add team member</button>
      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <form className="modal" aria-label="Add team member" onSubmit={async (e) => {
            e.preventDefault()
            const r = await run({ name: f.name, email: f.email, phone: f.phone, role: f.role, team: f.team, ...placeBody(f.place) })
            if (r.ok) setTimeout(() => setOpen(false), 1200)
          }}>
            <h2>Add team member</h2>
            <button type="button" className="btn btn-ghost btn-sm modal-close" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            <div className="field">
              <label className="label" htmlFor="tm-role">Role</label>
              <select id="tm-role" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole, place: me.role === 'manager' ? `manager:${me.id}` : '' })}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div className="field"><label className="label" htmlFor="tm-name">Full name</label><input id="tm-name" className="input" required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label className="label" htmlFor="tm-email">Work email</label><input id="tm-email" className="input" type="email" required maxLength={254} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="field"><label className="label" htmlFor="tm-phone">Phone (optional)</label><input id="tm-phone" className="input" inputMode="tel" maxLength={20} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            {f.role === 'manager' && <div className="field"><label className="label" htmlFor="tm-team">Team name (optional)</label><input id="tm-team" className="input" maxLength={60} value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} /></div>}
            <PlaceSelect me={me} role={f.role} value={f.place} onChange={(place) => setF({ ...f, place })} people={people} />
            <p className="help-note">They get an email to set their own password. Nobody, including you, ever sees it.</p>
            <Msg msg={msg} />
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
          </form>
        </div>
      )}
    </>
  )
}

export function EditStaff({ me, member, people }: { me: Me; member: Member; people: Member[] }) {
  const isAdmin = me.role === 'admin'
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: member.name ?? '', phone: member.phone ?? '', role: member.role, team: member.team ?? '', place: placeOf(member), moveLeadsTo: 'round_robin' })
  const { run, busy, msg, setMsg } = useAction(`/api/crm/staff/${member.id}`, 'PATCH')
  const save = () => {
    const b: Record<string, unknown> = { name: f.name, phone: f.phone }
    if (isAdmin && f.role !== member.role) b.role = f.role
    if (isAdmin && member.role === 'manager') b.team = f.team
    if (f.place !== placeOf(member) || b.role) Object.assign(b, placeBody(f.place))
    return run(b)
  }
  const others = people.filter((p) => p.active && p.id !== member.id && p.role !== 'admin')
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(true); setMsg(null) }}>Edit</button>
      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <form className="modal" aria-label={`Edit ${nameOf(member)}`} onSubmit={async (e) => { e.preventDefault(); const r = await save(); if (r.ok) setTimeout(() => setOpen(false), 900) }}>
            <h2>{nameOf(member)}</h2>
            <button type="button" className="btn btn-ghost btn-sm modal-close" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            <p className="small muted">{member.email}</p>
            <div className="field"><label className="label" htmlFor="es-name">Full name</label><input id="es-name" className="input" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label className="label" htmlFor="es-phone">Phone</label><input id="es-phone" className="input" maxLength={20} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            {isAdmin && (
              <div className="field">
                <label className="label" htmlFor="es-role">Role</label>
                <select id="es-role" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole, place: '' })}>
                  {(['manager', 'associate', 'ism'] as StaffRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
            )}
            {isAdmin && f.role === 'manager' && <div className="field"><label className="label" htmlFor="es-team">Team name</label><input id="es-team" className="input" maxLength={60} value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} /></div>}
            <PlaceSelect me={me} role={f.role} value={f.place} onChange={(place) => setF({ ...f, place })} people={people.filter((p) => p.id !== member.id)} />
            <Msg msg={msg} />
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>

            {isAdmin && (
              <div className="crm-danger stack" style={{ gap: '0.5rem' }}>
                {member.role === 'ism' && (
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void run({ inRotation: !member.in_rotation })}>
                    {member.in_rotation ? 'Pause round robin for them' : 'Resume round robin'}
                  </button>
                )}
                {member.active ? (
                  <>
                    <label className="label" htmlFor="es-move">When deactivating, move their open leads to</label>
                    <select id="es-move" className="select" value={f.moveLeadsTo} onChange={(e) => setF({ ...f, moveLeadsTo: e.target.value })}>
                      <option value="round_robin">Round robin (ISMs)</option>
                      <option value="">Keep them where they are</option>
                      {others.map((p) => <option key={p.id} value={p.id}>{nameOf(p)} · {ROLE_LABEL[p.role]}</option>)}
                    </select>
                    <button type="button" className="btn btn-outline btn-sm crm-danger-btn" disabled={busy}
                      onClick={() => { if (window.confirm(`Deactivate ${nameOf(member)}? They are signed out at once and can't sign in again. Their history stays.`)) void run({ active: false, moveLeadsTo: f.moveLeadsTo || undefined }) }}>
                      Deactivate account
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void run({ active: true })}>Reactivate account</button>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  )
}
