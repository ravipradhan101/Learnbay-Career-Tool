'use client'

import { Msg, useAction } from './useAction'

/** Admin: give every unassigned lead to the ISMs in the round robin. */
export function DistributeButton() {
  const { run, busy, msg } = useAction('/api/crm/distribute')
  return (
    <span className="row" style={{ gap: '0.5rem' }}>
      <button type="button" className="btn btn-outline btn-sm" disabled={busy}
        onClick={() => { if (window.confirm('Give all unassigned leads to ISMs by round robin?')) void run({}) }}>
        {busy ? 'Distributing…' : 'Distribute unassigned'}
      </button>
      <Msg msg={msg} />
    </span>
  )
}
