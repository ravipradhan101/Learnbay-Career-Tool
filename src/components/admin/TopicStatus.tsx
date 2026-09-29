'use client'

import { useState } from 'react'

const OPTIONS = [
  { id: 'new', label: 'New: needs a decision' },
  { id: 'in-course', label: 'Already taught: publish on site & brochure' },
  { id: 'to-add', label: 'Not taught yet: add to the course' },
  { id: 'not-relevant', label: 'Not relevant' },
]

/** Lets the team record what happens with a topic learners asked about. */
export function TopicStatus({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function change(next: string) {
    setValue(next)
    setState('saving')
    const r = await fetch(`/api/admin/topics/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status: next }) }).catch(() => null)
    setState(r?.ok ? 'saved' : 'error')
  }
  return (
    <span className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
      <select value={value} onChange={(e) => void change(e.target.value)} aria-label="Decision" disabled={state === 'saving'}>
        {OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <span className="small muted">{state === 'saved' ? 'Saved' : state === 'error' ? 'Not saved, try again' : ''}</span>
    </span>
  )
}
