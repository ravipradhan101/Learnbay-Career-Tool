'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { RichText } from './RichText'
import { Sparkle } from './Sparkle'
import { track } from '@/lib/analytics'
import { postJson } from '@/lib/client'

export type ChatMsg = { role: 'user' | 'model'; content: string; action?: { href: string; label: string } | null }

type Props = {
  context: 'home' | 'advisor' | 'skill-gap' | 'salary' | 'roadmap'
  signedIn: boolean
  initialMessages?: ChatMsg[]
  initialConversationId?: string | null
  suggestions?: string[]
  placeholder?: string
  greeting?: string
  /** Messages area grows inside a scrolling container (floating panel) instead of the page. */
  scrollBody?: boolean
  autoQuestion?: string | null
  onNavigate?: () => void
  newChatSignal?: number
}

export function AssistantChat({
  context, signedIn, initialMessages = [], initialConversationId = null, suggestions = [], placeholder = 'Or ask me a question about your career...',
  greeting, scrollBody = false, autoQuestion = null, onNavigate, newChatSignal = 0,
}: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const sentAuto = useRef<string | null>(null)

  useEffect(() => {
    if (newChatSignal) {
      setMessages([])
      setConversationId(null)
      setError('')
    }
  }, [newChatSignal])

  useEffect(() => {
    if (scrollBody) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, scrollBody])

  async function send(text: string) {
    const message = text.trim().slice(0, 600)
    if (!message || busy) return
    setError('')
    setInput('')
    const next: ChatMsg[] = [...messages, { role: 'user', content: message }]
    setMessages(next)
    setBusy(true)
    const res = await postJson('/api/assistant', {
      context,
      message,
      conversationId,
      // Anonymous visitors have no stored history; send the last few turns instead.
      history: signedIn ? undefined : messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    })
    setBusy(false)
    track(res.ok ? 'action' : 'error', 'assistant_message', { context, turn: messages.filter((m) => m.role === 'user').length + 1, status: res.ok ? undefined : res.status })
    if (!res.ok) {
      setMessages(messages)
      setInput(message)
      setError(res.error)
      return
    }
    if (typeof res.data.conversationId === 'string') setConversationId(res.data.conversationId)
    const action = res.data.action as ChatMsg['action']
    setMessages([...next, { role: 'model', content: String(res.data.reply ?? ''), action }])
  }

  useEffect(() => {
    if (autoQuestion && sentAuto.current !== autoQuestion) {
      sentAuto.current = autoQuestion
      send(autoQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuestion])

  const body = (
    <>
      {greeting && messages.length === 0 && (
        <div className="bubble-row">
          <span className="sparkle"><Sparkle /></span>
          <div className="bubble">{greeting}</div>
        </div>
      )}
      {messages.length > 0 && (
        <div className="msgs" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === 'model' ? <RichText text={m.content} /> : <p>{m.content}</p>}
              {m.action && (
                <div className="msg-action">
                  <Link href={m.action.href} className="btn btn-primary btn-sm" onClick={onNavigate}>
                    {m.action.label} <Icon name="arrowRight" size="0.9rem" />
                  </Link>
                </div>
              )}
            </div>
          ))}
          {busy && <div className="msg model" aria-label="Career AI is typing"><span className="typing"><i /><i /><i /></span></div>}
        </div>
      )}
      {messages.length === 0 && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <button key={s} type="button" className="suggestion" onClick={() => send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  )

  const form = (
    <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
      <Sparkle size="1.25rem" />
      <label className="sr-only" htmlFor={`chat-${context}`}>Ask Career AI</label>
      <input id={`chat-${context}`} value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder={placeholder} autoComplete="off" />
      <button className="send-btn" aria-label="Send" disabled={busy || !input.trim()}>
        {busy ? <span className="spinner" /> : <Icon name="send" size="1.1rem" />}
      </button>
    </form>
  )

  if (scrollBody) {
    return (
      <>
        <div className="panel-body" ref={bodyRef}>{body}</div>
        <div className="panel-foot">{form}</div>
      </>
    )
  }
  return (
    <div className="stack" style={{ gap: '0.875rem' }}>
      {body}
      {form}
    </div>
  )
}
