'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { postForm } from '@/lib/client'
import type { ResumeAnalysis } from '@/lib/report-types'

const MAX_BYTES = 5 * 1024 * 1024

export function ResumeReview({ initial }: { initial: { analysis: ResumeAnalysis; fileName: string | null } | null }) {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initial?.analysis ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
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

  if (!analysis) {
    return (
      <section className="card stack">
        {error && <p className="form-error" role="alert">{error}</p>}
        <div
          className={`upload-zone${drag ? ' drag' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload your resume PDF"
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) upload(e.dataTransfer.files[0]) }}
        >
          {busy ? (
            <>
              <span className="spinner text-primary" style={{ width: '2rem', height: '2rem' }} />
              <b>Reviewing your resume…</b>
              <span className="small muted">This takes about 20–40 seconds.</span>
            </>
          ) : (
            <>
              <span className="fc-icon" style={{ width: '3rem', height: '3rem' }}><Icon name="upload" size="1.5rem" /></span>
              <b>Drop your resume here or click to upload</b>
              <span className="small muted">PDF only, up to 5 MB. One free review per learner.</span>
            </>
          )}
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => upload(e.target.files?.[0] ?? undefined)} />
        </div>
        <p className="secure-note"><Icon name="lock" size="0.9rem" /> Your file is analyzed and then discarded. We only keep the feedback.</p>
      </section>
    )
  }

  return (
    <>
      <div className="grid-2">
        <section className="card stack">
          <p className="muted small">We found some opportunities to make your profile stronger.</p>
          <div className="score-row">
            <div className="score-ring" style={{ ['--v' as string]: analysis.score }}>
              <div><b>{analysis.score}</b><small>/100</small></div>
            </div>
            <div className="stack" style={{ gap: '0.375rem', flex: 1, minWidth: '12rem' }}>
              <b>AI Readiness Score</b>
              <p className="small muted">{analysis.summary}</p>
            </div>
          </div>
        </section>
        <section className="card stack">
          <h2 className="card-title">Key Suggestions</h2>
          <ul className="list-check">{analysis.suggestions.map((s) => <li key={s}><Icon name="checkCircle" size="1.1rem" />{s}</li>)}</ul>
          <button type="button" className="btn btn-primary" onClick={() => setShowDetail((v) => !v)} aria-expanded={showDetail}>
            {showDetail ? 'Hide Detailed Feedback' : 'View Detailed Feedback'} <Icon name={showDetail ? 'chevronDown' : 'arrowRight'} size="1rem" />
          </button>
        </section>
      </div>
      {showDetail && (
        <div className="grid-2">
          <section className="card stack">
            <h2 className="card-title">What&apos;s working</h2>
            <ul className="list-check">{analysis.strengths.map((s) => <li key={s}><Icon name="check" size="1.1rem" />{s}</li>)}</ul>
            <h2 className="card-title">Keywords to add</h2>
            <div className="tag-list">{analysis.missingKeywords.map((k) => <span className="pill primary" key={k}>{k}</span>)}</div>
          </section>
          <section className="card stack">
            <h2 className="card-title">Section-by-section</h2>
            {analysis.sectionFeedback.map((f) => (
              <div key={f.section}><b>{f.section}</b><p className="small muted">{f.feedback}</p></div>
            ))}
          </section>
        </div>
      )}
      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <div>
          <b>Want a recruiter-style review?</b>
          <p className="small muted">A career counselor can review your updated resume with you.</p>
        </div>
        <Link href="/dashboard/counselor" className="btn btn-outline">Talk to a Counselor</Link>
      </section>
    </>
  )
}
