'use client'

import { useRef, useState } from 'react'
import { Icon } from '../Icon'
import { postForm } from '@/lib/client'
import type { ResumeAnalysis } from '@/lib/tool-types'

const MAX_BYTES = 5 * 1024 * 1024

/** Optional resume check inside the Skill Gap result. PDF only; the file is never stored. */
export function ResumeReview({ initial }: { initial: ResumeAnalysis | null }) {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [detail, setDetail] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    setError('')
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setError('Please upload your resume as a PDF.')
    if (file.size > MAX_BYTES) return setError('Please upload a PDF under 5 MB.')
    const form = new FormData()
    form.append('resume', file)
    setBusy(true)
    const res = await postForm('/api/resume', form)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setAnalysis(res.data.analysis as ResumeAnalysis)
  }

  return (
    <section className="card stack no-print">
      <div className="row between">
        <h2 className="card-title"><Icon name="file" className="text-primary" /> Sharpen it with your resume</h2>
        <span className="pill">Optional</span>
      </div>
      {!analysis ? (
        <>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div
            className={`upload-zone${drag ? ' drag' : ''}`} role="button" tabIndex={0} aria-label="Upload your resume PDF"
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) upload(e.dataTransfer.files[0]) }}
          >
            {busy
              ? <><span className="spinner text-primary" style={{ width: '1.75rem', height: '1.75rem' }} /><b>Reviewing your resume…</b><span className="small muted">About 20–40 seconds.</span></>
              : <><span className="fc-icon"><Icon name="upload" /></span><b>Upload your resume for a readiness score</b><span className="small muted">PDF only, up to 5 MB. One free review.</span></>}
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => upload(e.target.files?.[0] ?? undefined)} />
          </div>
          <p className="secure-note"><Icon name="lock" size="0.9rem" /> Your file is analysed and discarded. Only the feedback is kept.</p>
        </>
      ) : (
        <>
          <div className="score-row">
            <div className="score-ring" style={{ ['--v' as string]: analysis.score }}><div><b>{analysis.score}</b><small>/100</small></div></div>
            <div className="stack" style={{ gap: '0.375rem', flex: 1, minWidth: '14rem' }}><b>Resume readiness</b><p className="small muted">{analysis.summary}</p></div>
          </div>
          <ul className="list-check">{analysis.suggestions.map((s) => <li key={s}><Icon name="checkCircle" size="1.1rem" />{s}</li>)}</ul>
          <button type="button" className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }} aria-expanded={detail} onClick={() => setDetail((d) => !d)}>
            {detail ? 'Hide detailed feedback' : 'View detailed feedback'}
          </button>
          {detail && (
            <div className="grid-2">
              <div className="stack" style={{ gap: '0.5rem' }}>
                <b>What works</b>
                <ul className="list-check">{analysis.strengths.map((s) => <li key={s}><Icon name="check" size="1.1rem" />{s}</li>)}</ul>
                <b>Keywords to add</b>
                <div className="tag-list">{analysis.missingKeywords.map((k) => <span className="pill primary" key={k}>{k}</span>)}</div>
              </div>
              <div className="stack" style={{ gap: '0.5rem' }}>
                {analysis.sectionFeedback.map((f) => <div key={f.section}><b>{f.section}</b><p className="small muted">{f.feedback}</p></div>)}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
