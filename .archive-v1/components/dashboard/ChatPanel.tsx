'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { Robot } from '../Robot'
import { postJson } from '@/lib/client'

type Msg = { role: 'user' | 'model'; content: string }

/** Renders model text safely: paragraphs, "- " bullet lists and **bold**. No HTML is ever injected. */
function RichText({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul'; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^([-*•]|\d+[.)])\s+/.test(line)
    const content = line.replace(/^([-*•]|\d+[.)])\s+/, '')
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.lines.push(content)
      else blocks.push({ type: 'ul', lines: [content] })
    } else blocks.push({ type: 'p', lines: [line] })
  }
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part.replace(/^#+\s*/, '')}</Fragment>,
    )
  return (
    <>
      {blocks.map((b, i) =>
        b.type === 'ul' ? <ul key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul> : <p key={i}>{inline(b.lines[0])}</p>,
      )}
    </>
  )
}

export function ChatPanel({ name, initialConversationId, initialMessages, suggestions, remainingToday, remainingTotal }: {
  name: string
  initialConversationId: string | null
  initialMessages: Msg[]
  suggestions: string[]
  remainingToday: number
  remainingTotal: number
}) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState({ today: remainingToday, total: remainingTotal })
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const outOfQuestions = left.today <= 0 || left.total <= 0

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy || outOfQuestions) return
    setError('')
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: message }])
    setBusy(true)
    const res = await postJson('/api/chat', { message, conversationId })
    setBusy(false)
    if (!res.ok) {
      setMessages((m) => m.slice(0, -1))
      setInput(message)
      setError(res.error)
      if (res.data.limit === 'daily') setLeft((l) => ({ ...l, today: 0 }))
      if (res.data.limit === 'total') setLeft((l) => ({ ...l, total: 0 }))
      return
    }
    setConversationId(String(res.data.conversationId))
    setMessages((m) => [...m, { role: 'model', content: String(res.data.reply) }])
    setLeft({ today: Number(res.data.remainingToday), total: Number(res.data.remainingTotal) })
  }

  function newChat() {
    setConversationId(null)
    setMessages([])
    setError('')
  }

  return (
    <section className="card chat">
      <div className="chat-head">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <span className="chat-avatar"><Robot sparkles={false} /></span>
          <div>
            <b>Career AI</b>
            <p className="xsmall muted">Your personal AI advisor</p>
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={newChat} disabled={busy}><Icon name="plus" size="0.9rem" /> New Chat</button>
      </div>

      <div className="chat-body" ref={bodyRef} aria-live="polite">
        <div className="msg model">
          <p>Hi {name}! I know your background and goals. How can I help you today?</p>
        </div>
        {messages.length === 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <button key={s} type="button" className="suggestion" onClick={() => send(s)} disabled={busy || outOfQuestions}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'model' ? <RichText text={m.content} /> : <p>{m.content}</p>}
          </div>
        ))}
        {busy && <div className="msg model" aria-label="Career AI is typing"><span className="typing"><i /><i /><i /></span></div>}
        {error && (
          <div className="form-error" role="alert">
            {error}{' '}
            {outOfQuestions && <Link href="/dashboard/counselor">Talk to a Counselor</Link>}
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <label className="sr-only" htmlFor="chat-input">Ask Career AI</label>
        <input id="chat-input" className="input" maxLength={1000} placeholder={outOfQuestions ? 'Question limit reached' : 'Ask me anything about your career...'}
          value={input} onChange={(e) => setInput(e.target.value)} disabled={outOfQuestions} autoComplete="off" />
        <button className="btn btn-primary" aria-label="Send" disabled={busy || !input.trim() || outOfQuestions}><Icon name="send" size="1.1rem" /></button>
      </form>
      <p className="xsmall muted" style={{ padding: '0 1rem 0.75rem' }}>
        {left.total > 0 ? `${Math.min(left.today, left.total)} questions left today. ` : ''}Career AI can make mistakes; check important details with a counselor.
      </p>
    </section>
  )
}
