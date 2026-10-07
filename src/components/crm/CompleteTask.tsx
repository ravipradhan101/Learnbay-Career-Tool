'use client'

import { useState } from 'react'
import { CALL_OUTCOMES } from '@/lib/crm/roles'
import { Msg, useAction } from './useAction'

/** Log what happened on a call (or tick off a reminder). */
export function CompleteTask({ leadId, taskId, isCall }: { leadId: string; taskId: string; isCall: boolean }) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [note, setNote] = useState('')
  const [close, setClose] = useState(false)
  const { run, busy, msg } = useAction(`/api/crm/leads/${leadId}`)
  if (!open) return <button type="button" className="btn btn-soft btn-sm" onClick={() => setOpen(true)}>{isCall ? 'Log call' : 'Done'}</button>
  const retry = outcome === 'no_answer' || outcome === 'busy'
  return (
    <form className="crm-inline-form" onSubmit={async (e) => {
      e.preventDefault()
      const r = await run({ action: 'complete', taskId, outcome: isCall ? outcome : 'done', note, close })
      if (r.ok) setOpen(false)
    }}>
      {isCall && (
        <select className="select" required value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Call outcome">
          <option value="">What happened?</option>
          {CALL_OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      )}
      <input className="input" placeholder="Note (optional)" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
      {retry && <label className="small row" style={{ gap: '0.35rem' }}><input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} /> Close it (no more tries)</label>}
      <div className="row" style={{ gap: '0.4rem' }}>
        <button className="btn btn-primary btn-sm" disabled={busy || (isCall && !outcome)}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <Msg msg={msg} />
    </form>
  )
}
