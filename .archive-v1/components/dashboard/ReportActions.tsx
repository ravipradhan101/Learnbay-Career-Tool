'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { postJson } from '@/lib/client'

export function ReportActions({ shared }: { shared: boolean }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [isShared, setIsShared] = useState(shared)

  async function share() {
    setOpen(true)
    setMsg('')
    if (url) return
    setBusy(true)
    const res = await postJson('/api/report/share', {})
    setBusy(false)
    if (!res.ok) return setMsg(res.error)
    setUrl(String(res.data.url))
    setIsShared(true)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMsg('Link copied.')
    } catch {
      setMsg('Select the link and copy it.')
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My AI career roadmap', url })
      } catch {
        // cancelled
      }
    } else copy()
  }

  async function revoke() {
    setBusy(true)
    const res = await postJson('/api/report/share', {}, 'DELETE')
    setBusy(false)
    if (!res.ok) return setMsg(res.error)
    setUrl('')
    setIsShared(false)
    setOpen(false)
  }

  return (
    <div className="row no-print">
      <Link href="/print" className="btn btn-outline btn-sm" target="_blank"><Icon name="download" size="1rem" /> Download PDF</Link>
      <button type="button" className="btn btn-outline btn-sm" onClick={share}><Icon name="share" size="1rem" /> Share</button>
      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title" style={{ textAlign: 'left' }}>
            <button type="button" className="icon-btn modal-close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" /></button>
            <h2 id="share-title" style={{ fontSize: '1.25rem' }}>Share your roadmap</h2>
            <p className="muted small">Anyone with this link can see your roadmap, skill gaps and project ideas. Your email, phone number and salary are never shown.</p>
            {busy && !url && <span className="spinner text-primary" />}
            {url && (
              <>
                <label className="sr-only" htmlFor="share-url">Share link</label>
                <input id="share-url" className="input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
                <div className="row">
                  <button type="button" className="btn btn-primary btn-sm" onClick={nativeShare}><Icon name="share" size="0.9rem" /> Share link</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={copy}>Copy</button>
                  {isShared && <button type="button" className="btn btn-ghost btn-sm" onClick={revoke} disabled={busy}>Turn off link</button>}
                </div>
              </>
            )}
            {msg && <p className="small muted" role="status">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
