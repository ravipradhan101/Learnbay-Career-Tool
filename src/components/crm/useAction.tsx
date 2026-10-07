'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { postJson, type ApiResult } from '@/lib/client'

/** Runs a CRM API call, shows its message or error, and refreshes the server-rendered page on success. */
export function useAction(url: string, method: 'POST' | 'PATCH' = 'POST') {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function run(body: Record<string, unknown>, opts: { refresh?: boolean } = {}): Promise<ApiResult> {
    setBusy(true)
    setMsg(null)
    const r = await postJson(url, body, method)
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: String(r.data.message ?? 'Saved.') } : { ok: false, text: r.error })
    if (r.ok && opts.refresh !== false) router.refresh()
    return r
  }
  return { run, busy, msg, setMsg }
}

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <p className={msg.ok ? 'crm-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>
}
