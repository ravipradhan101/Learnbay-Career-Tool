'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { track } from '@/lib/analytics'
import type { Action } from '@/lib/report-summary'

/**
 * "Your next 3 moves": the few things worth doing now, with a tick box each.
 * Progress is remembered on this device; seeing 1 of 3 done nudges people to finish.
 */
export function ActionPlan({ tool, actions }: { tool: string; actions: Action[] }) {
  const key = `lcn_actions:${tool}`
  const [done, setDone] = useState<number[]>([])
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(key) ?? '[]')) } catch { /* ignore */ }
  }, [key])
  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i]
    setDone(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
    track('action', 'report_action_toggle', { tool, item: i + 1, done: !done.includes(i) })
  }
  const count = done.filter((i) => i < actions.length).length
  return (
    <section className="action-plan" aria-labelledby={`ap-${tool}`}>
      <div className="row between">
        <h2 id={`ap-${tool}`} className="card-title"><Icon name="target" className="text-primary" /> Your next {actions.length} moves</h2>
        <span className="small muted">{count} of {actions.length} done</span>
      </div>
      <div className="ap-progress" aria-hidden="true"><i style={{ width: `${(count / Math.max(1, actions.length)) * 100}%` }} /></div>
      <ol className="ap-list">
        {actions.map((a, i) => (
          <li key={a.title} className={done.includes(i) ? 'done' : undefined}>
            <button type="button" className="ap-check" aria-pressed={done.includes(i)} aria-label={`Mark "${a.title}" as done`} onClick={() => toggle(i)}>
              {done.includes(i) ? <Icon name="check" size="1rem" /> : i + 1}
            </button>
            <div className="ap-text">
              <b>{a.title}</b>
              {a.detail && <span>{a.detail}</span>}
            </div>
            {a.href && a.cta && <Link href={a.href} className={`btn btn-sm ${a.href.includes('sessions') ? 'btn-primary' : 'btn-outline'}`}>{a.cta}</Link>}
          </li>
        ))}
      </ol>
    </section>
  )
}
