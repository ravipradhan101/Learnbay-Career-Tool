'use client'

import { useState } from 'react'
import { Icon } from '../Icon'
import { postJson } from '@/lib/client'
import { trackEvent } from '@/lib/track'

/** Email the report to the registered address, and share a read-only link. */
export function ToolActions({ toolId, toolName, shared, email }: { toolId: string; toolName: string; shared: boolean; email: string }) {
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [mailMsg, setMailMsg] = useState('')

  async function sendReport() {
    setMail('sending')
    const res = await postJson(`/api/tools/${toolId}/email`, {})
    if (!res.ok) { setMail('error'); setMailMsg(res.error); return }
    setMail('sent')
    setMailMsg(`Sent to ${email}`)
    trackEvent('report_emailed', { tool: toolId })
  }

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
    const res = await postJson(`/api/tools/${toolId}/share`, {})
    setBusy(false)
    if (!res.ok) return setMsg(res.error)
    setUrl(String(res.data.url))
    setIsShared(true)
    trackEvent('share_created', { tool: toolId })
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMsg('Link copied.') } catch { setMsg('Select the link and copy it.') }
  }
  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: `My ${toolName}`, url }) } catch { /* cancelled */ }
    } else copy()
  }
  async function revoke() {
    setBusy(true)
    const res = await postJson(`/api/tools/${toolId}/share`, {}, 'DELETE')
    setBusy(false)
    if (!res.ok) return setMsg(res.error)
    setUrl('')
    setIsShared(false)
    setOpen(false)
  }

  return (
    <div className="row no-print" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
      <button type="button" className="btn btn-outline btn-sm" onClick={sendReport} disabled={mail === 'sending'} title={`Sends to ${email}`}>
        {mail === 'sending' ? <span className="spinner" /> : <Icon name={mail === 'sent' ? 'checkCircle' : 'mail'} size="1rem" />}
        {mail === 'sent' ? 'Sent to your email' : 'Email me this report'}
      </button>
      <button type="button" className="btn btn-outline btn-sm" onClick={share}><Icon name="share" size="1rem" /> Share</button>
      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
            <button type="button" className="icon-btn modal-close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" /></button>
            <h2 id="share-title">Share your {toolName}</h2>
            <p className="muted small">Anyone with this link can view this analysis. Your email, phone and current salary are never shown.</p>
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
      {mailMsg && <p className={`small ${mail === 'error' ? 'form-error' : 'muted'}`} role="status" style={{ width: '100%', textAlign: 'right' }}>{mailMsg}</p>}
    </div>
  )
}
