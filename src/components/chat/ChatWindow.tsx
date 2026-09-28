'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../Icon'
import { RichText } from '../RichText'
import { Avatar } from './Avatar'
import { CardView } from './Cards'
import type { ChatApi, Choice, Item } from './engine'
import { BOT_NAME, COUNSELLOR_TITLE, GUIDE_TITLE, getCounsellor } from '@/lib/counsellors'

const time = (at: number) => new Date(at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
export const nameOf = (who: string) => (who === 'bot' ? BOT_NAME : getCounsellor(who).name)

/** The chat: who you are talking to, the conversation, quick replies, and the message box. The call button is always in the header. */
export function ChatWindow({ chat, onSend, onCall, headerRight, footer, onLink }: {
  chat: ChatApi
  onSend: (text: string) => void
  onCall: () => void
  headerRight?: React.ReactNode
  footer?: React.ReactNode
  onLink?: (href: string) => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const { items, prompt, asking, suggestions, thinking, who, callOffer } = chat
  const isBot = who === 'bot'

  // Keep the newest message in view.
  const last = items[items.length - 1]
  const lastLen = last && last.kind === 'bot' ? last.text.length : 0
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [items.length, prompt, suggestions.length, asking, callOffer])
  // While a message is being typed out, follow it without animation.
  useEffect(() => {
    const el = bodyRef.current
    if (el && lastLen) el.scrollTop = el.scrollHeight
  }, [lastLen])

  useEffect(() => {
    if (asking) inputRef.current?.focus()
  }, [asking])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setText('')
    onSend(value.slice(0, asking?.maxLength ?? 600))
  }

  return (
    <section className="tc" aria-label={`Chat with ${nameOf(who)}, ${isBot ? 'your career guide' : 'your career counsellor'}`}>
      <header className="tc-header">
        <Avatar who={who} size={38} online />
        <div className="tc-who">
          <div className="tc-name"><b>{nameOf(who)}</b><span className="tc-badge">{isBot ? GUIDE_TITLE : COUNSELLOR_TITLE}</span></div>
          <span className="tc-status"><i /> Online · {isBot ? 'virtual career guide' : 'virtual counsellor'}</span>
        </div>
        <div className="tc-header-right">
          {headerRight}
          <button type="button" className="tc-call" aria-label={`Get a call from ${isBot ? 'a Learnbay counsellor' : nameOf(who)}`} title="Get a call" onClick={onCall}>
            <Icon name="phone" size="1.25rem" />
          </button>
        </div>
      </header>

      <div className="tc-body" ref={bodyRef} aria-live="polite">
        {items.map((item, i) => <Row key={item.id} item={item} prev={items[i - 1]} next={items[i + 1]} chat={chat} onLink={onLink} />)}

        {callOffer && !asking && (
          <div className="tc-suggest">
            <button type="button" className="tc-chip tc-chip-call" onClick={() => { chat.setCallOffer(false); onCall() }}><Icon name="phone" size="0.9rem" /> Yes, call me now</button>
            <button type="button" className="tc-chip" onClick={() => chat.setCallOffer(false)}>Not now</button>
          </div>
        )}

        {!asking && !thinking && suggestions.length > 0 && (
          <div className="tc-suggest" aria-label="Suggested questions">
            {suggestions.map((s) => <button key={s} type="button" className="tc-chip tc-chip-soft" onClick={() => onSend(s)}><Icon name="message" size="0.85rem" />{s}</button>)}
          </div>
        )}

        {prompt && <PromptView prompt={prompt} onPick={chat.pick} onPickMany={chat.pickMany} />}
      </div>

      {asking?.label && (
        <div className="tc-ask-label" aria-hidden="true">
          <Icon name="user" size="0.85rem" /><b>{asking.label}</b><span>· type below and press Enter</span>
        </div>
      )}
      <form className={`tc-composer${asking ? ' tc-composer-asking' : ''}`} onSubmit={submit}>
        <label className="sr-only" htmlFor="tc-input">{asking ? asking.label ?? asking.placeholder : 'Type your question'}</label>
        <input
          id="tc-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off"
          maxLength={asking?.maxLength ?? 600} inputMode={asking?.inputMode ?? 'text'}
          placeholder={asking ? asking.placeholder : 'Or type your question…'}
        />
        <button className="tc-send" aria-label="Send" disabled={!text.trim() || thinking}>
          {thinking ? <span className="spinner" /> : <Icon name="send" size="1.15rem" />}
        </button>
      </form>
      {footer && <div className="tc-foot">{footer}</div>}
    </section>
  )
}

const fromBot = (i?: Item) => Boolean(i && (i.kind === 'bot' || i.kind === 'card' || i.kind === 'typing'))
const speaker = (i?: Item) => (i && (i.kind === 'bot' || i.kind === 'card' || i.kind === 'typing') ? i.by ?? '' : '')

function Row({ item, prev, next, chat, onLink }: { item: Item; prev?: Item; next?: Item; chat: ChatApi; onLink?: (href: string) => void }) {
  if (item.kind === 'divider') return <div className="tc-divider"><span>{item.text}</span></div>
  if (item.kind === 'event') {
    return (
      <div className={`tc-event ${item.tone}`} role="status">
        <i aria-hidden="true" />{item.text}
      </div>
    )
  }
  if (item.kind === 'user') return <div className="tc-row tc-row-user"><div className="tc-bubble tc-bubble-user">{item.text}</div></div>

  const by = item.by ?? 'tanya'
  const first = !fromBot(prev) || speaker(prev) !== by
  const last = !fromBot(next) || speaker(next) !== by
  return (
    <div className={`tc-row tc-row-bot ${first ? 'first' : ''}`}>
      <span className="tc-row-avatar">{first ? <Avatar who={by} size={28} /> : null}</span>
      <div className="tc-row-main">
        {first && <span className="tc-speaker">{nameOf(by)}</span>}
        {item.kind === 'typing' && <div className="tc-bubble tc-typing" aria-label={`${nameOf(by)} is typing`}><i /><i /><i /></div>}
        {item.kind === 'bot' && (
          <div className={`tc-bubble ${/\n\s*[-*•] /.test(item.text) ? 'tc-bubble-rich' : ''}`}>
            <RichText text={item.text} rich />
            {item.action && (
              <Link href={item.action.href} className="tc-btn tc-btn-primary tc-btn-sm tc-bubble-action" scroll={false} onClick={() => onLink?.(item.action!.href)}>
                {item.action.label} <Icon name="arrowRight" size="0.85rem" />
              </Link>
            )}
          </div>
        )}
        {item.kind === 'card' && <CardView card={item.card} live={Boolean(item.live)} onDone={(v) => chat.cardDone(item.id, v)} />}
        {last && item.kind !== 'typing' && <span className="tc-time">{time(item.at)}</span>}
      </div>
    </div>
  )
}

function PromptView({ prompt, onPick, onPickMany }: { prompt: NonNullable<ChatApi['prompt']>; onPick: (c: Choice) => void; onPickMany: (c: Choice[]) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  if (prompt.multi) {
    const toggle = (id: string) => setPicked((p) => (id === 'none' ? (p.includes('none') ? [] : ['none']) : p.includes(id) ? p.filter((x) => x !== id) : [...p.filter((x) => x !== 'none'), id]))
    return (
      <div className="tc-prompt">
        <div className="tc-chips">
          {prompt.choices.map((c) => <button key={c.id} type="button" className="tc-chip" aria-pressed={picked.includes(c.id)} onClick={() => toggle(c.id)}>{picked.includes(c.id) && <Icon name="check" size="0.85rem" />}{c.label}</button>)}
        </div>
        <button type="button" className="tc-btn tc-btn-primary tc-btn-sm" disabled={!picked.length} onClick={() => onPickMany(prompt.choices.filter((c) => picked.includes(c.id)))}>
          {prompt.doneLabel ?? 'Continue'} <Icon name="arrowRight" size="0.9rem" />
        </button>
      </div>
    )
  }
  if (prompt.style === 'chips') {
    return (
      <div className="tc-prompt">
        <div className="tc-chips">
          {prompt.choices.map((c) => (
            <button key={c.id} type="button" className={`tc-chip ${c.id === 'call' ? 'tc-chip-call' : ''}`} onClick={() => onPick(c)}>
              {c.icon && <Icon name={c.icon} size="0.95rem" />}{c.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="tc-prompt tc-choices">
      {prompt.choices.map((c) => (
        <button key={c.id} type="button" className="tc-choice" onClick={() => onPick(c)}>
          <span className="tc-choice-icon"><Icon name={c.icon ?? 'arrowRight'} size="1.2rem" /></span>
          <span className="tc-choice-text"><b>{c.label}</b>{c.hint && <small>{c.hint}</small>}</span>
          <Icon name="arrowRight" size="1.1rem" className="tc-choice-arrow" />
        </button>
      ))}
    </div>
  )
}
