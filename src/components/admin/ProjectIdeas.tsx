'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { postJson } from '@/lib/client'

export type IdeaRow = {
  id: string; title: string; objective: string; outcome: string | null; tools: string[]; program: string; profiles: string[]
  industry: string | null; learner_brief: string | null; seen: number; created_at: string
}

/**
 * Project ideas the AI proposed for learners whose profile the library didn't cover well. Approve the good ones into
 * the library (they then go to every learner with that profile); reject the rest. Most-requested first.
 */
export function ProjectIdeas({ ideas }: { ideas: IdeaRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function act(i: IdeaRow, action: 'approve' | 'reject') {
    setBusy(`${i.id}:${action}`)
    const r = await postJson(`/api/admin/project-ideas/${i.id}`, { action, title: titles[i.id] ?? i.title })
    setBusy('')
    setMsg(r.ok ? { ok: true, text: String(r.data.message) } : { ok: false, text: r.error })
    if (r.ok) router.refresh()
  }
  return (
    <section className="card stack">
      <div className="row between">
        <h2 className="card-title">Ideas to review ({ideas.length})</h2>
        <span className="small muted">Proposed by AI for learners the library didn’t fit well. Approved ideas join the library for that course and profile.</span>
      </div>
      {msg && <p className={msg.ok ? 'small' : 'form-error'} role="status">{msg.text}</p>}
      {!ideas.length && <p className="muted small">Nothing waiting. New ideas appear here when an unusual profile asks for projects.</p>}
      {ideas.map((i) => (
        <article key={i.id} className="stack" style={{ gap: '0.35rem', borderTop: '1px solid var(--line-2)', paddingTop: '0.75rem' }}>
          <input className="input" aria-label="Title" value={titles[i.id] ?? i.title} maxLength={120} onChange={(e) => setTitles({ ...titles, [i.id]: e.target.value })} />
          <p className="small" style={{ margin: 0 }}><b>Goal:</b> {i.objective}</p>
          {i.outcome && <p className="small" style={{ margin: 0 }}><b>Result:</b> {i.outcome}</p>}
          <p className="small muted" style={{ margin: 0 }}>
            {i.program}{i.profiles.length ? ` · ${i.profiles.join(', ')}` : ''}{i.industry ? ` · ${i.industry}` : ''} · {i.tools.join(', ') || 'no tools listed'} · asked by {i.seen} learner{i.seen === 1 ? '' : 's'}
          </p>
          {i.learner_brief && <details className="small"><summary>For which learner</summary><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{i.learner_brief}</pre></details>}
          <div className="row" style={{ gap: '0.4rem' }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={Boolean(busy)} onClick={() => void act(i, 'approve')}>{busy === `${i.id}:approve` ? 'Adding…' : 'Approve into library'}</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={Boolean(busy)} onClick={() => void act(i, 'reject')}>{busy === `${i.id}:reject` ? '…' : 'Reject'}</button>
          </div>
        </article>
      ))}
    </section>
  )
}
