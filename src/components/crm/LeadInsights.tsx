'use client'

import { useCallback, useEffect, useState } from 'react'
import { getJson, postJson } from '@/lib/client'
import type { InsightSummary, Intent } from '@/lib/crm/insights'

type State = { intent: Intent; summary: InsightSummary | null; generatedAt: string | null; stale: boolean }

const BAND = { hot: 'Hot', warm: 'Warm', cold: 'Cold' } as const

/** The intent score with its reasons, and the AI brief (built on first view, and again when the learner does something new). */
export function LeadInsights({ leadId, initial }: { leadId: string; initial: { intent: Intent; summary: InsightSummary | null; generatedAt: string | null; stale: boolean } }) {
  const [s, setS] = useState<State>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const build = useCallback(async (force = false) => {
    setBusy(true)
    setError('')
    const r = await postJson(`/api/crm/leads/${leadId}/insights${force ? '?force=1' : ''}`, {})
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    setS(r.data as unknown as State)
  }, [leadId])

  // Missing or out of date: write it now (the page stays usable meanwhile).
  useEffect(() => { if (!initial.summary || initial.stale) void build() }, [build, initial.summary, initial.stale])
  // Keep the score fresh when the tab comes back into view.
  useEffect(() => {
    const onFocus = async () => { const r = await getJson(`/api/crm/leads/${leadId}/insights`); if (r.ok) setS((p) => ({ ...p, intent: (r.data as unknown as State).intent })) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [leadId])

  const sum = s.summary
  return (
    <section className="crm-panel crm-insights" id="insights" aria-labelledby="insights-h">
      <div className="crm-panel-head">
        <h2 id="insights-h">Lead intelligence</h2>
        <div className="crm-panel-tools">
          {s.generatedAt && <span className="crm-faint">Updated {new Date(s.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</span>}
          <button type="button" className="crm-btn ghost" onClick={() => build(true)} disabled={busy}>{busy ? 'Reading their activity…' : 'Refresh'}</button>
        </div>
      </div>

      <div className="crm-intent">
        <div className={`crm-intent-score ${s.intent.band}`} aria-label={`Purchase intent ${s.intent.score} of 100, ${BAND[s.intent.band]}`}>
          <b>{s.intent.score}</b><span>{BAND[s.intent.band]}</span>
        </div>
        <div className="crm-intent-body">
          <span className="crm-label">Chance they’ll buy</span>
          <div className="crm-meter" aria-hidden="true"><i className={s.intent.band} style={{ width: `${s.intent.score}%` }} /></div>
          <ul className="crm-factors">
            {s.intent.factors.map((f) => <li key={f.label} className={f.points < 0 ? 'neg' : ''}><span>{f.label}</span><b>{f.points > 0 ? '+' : ''}{f.points}</b></li>)}
          </ul>
        </div>
      </div>

      {error && <p className="crm-error" role="alert">{error}</p>}
      {!sum && busy && <div className="crm-skeleton" aria-live="polite"><i /><i /><i /><span>Reading their conversations and actions…</span></div>}
      {sum && (
        <div className="crm-brief" aria-busy={busy}>
          <p className="crm-brief-summary">{sum.summary}</p>
          {sum.nextBestAction && <div className="crm-next"><span className="crm-label">Next best action</span><p>{sum.nextBestAction}</p></div>}
          <div className="crm-brief-grid">
            <List title="Pain points" items={sum.painPoints} tone="pain" />
            <List title="Looking for" items={sum.lookingFor} tone="want" />
            <List title="Liked" items={sum.liked} tone="good" />
            <List title="Skipped or didn’t like" items={sum.skippedOrDisliked} tone="skip" />
            <List title="Objections" items={sum.objections} tone="warn" />
            <List title="Buying signals" items={sum.buyingSignals} tone="good" />
          </div>
          {sum.talkingPoints.length > 0 && <List title="Say this on the call" items={sum.talkingPoints} tone="talk" wide />}
          {sum.riskFlags.length > 0 && <List title="Risks" items={sum.riskFlags} tone="warn" wide />}
          <p className="crm-faint">Written by AI from this learner’s own answers, chat and actions on Career Studio. Check before quoting.</p>
        </div>
      )}
    </section>
  )
}

function List({ title, items, tone, wide = false }: { title: string; items: string[]; tone: string; wide?: boolean }) {
  return (
    <div className={`crm-brief-list ${tone}${wide ? ' wide' : ''}`}>
      <span className="crm-label">{title}</span>
      {items.length ? <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="crm-faint">Nothing in the record yet.</p>}
    </div>
  )
}
