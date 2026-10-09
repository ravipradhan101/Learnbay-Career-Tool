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
export function ChatWindow({ chat, onSend, onCall, headerRight, footer, onLink, profile, rating }: {
  chat: ChatApi
  onSend: (text: string) => void
  /** Omitted before login (with Bruce): no call button. */
  onCall?: () => void
  headerRight?: React.ReactNode
  footer?: React.ReactNode
  onLink?: (href: string) => void
  /** The counsellor's profile box, opened from their photo or name (signed-in chat only). */
  profile?: (who: string, close: () => void) => React.ReactNode
  /** The counsellor's rating, shown next to their name. */
  rating?: { avg: number; count: number } | null
}) {
  const [profileOf, setProfileOf] = useState<string | null>(null)
  const openProfile = profile ? (who: string) => setProfileOf((cur) => (cur === who ? null : who)) : undefined
  useEffect(() => {
    if (!profileOf) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOf(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [profileOf])
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const { items, prompt, asking, suggestions, thinking, who, callOffer, more } = chat
  const isBot = who === 'bot'

  // Keep the newest message in view, but only while the learner is at the bottom: scrolling up to read earlier
  // messages is never pulled back down. A button brings them back (with a dot when something new arrived).
  const [atBottom, setAtBottom] = useState(true)
  const [unread, setUnread] = useState(false)
  const atBottomRef = useRef(true)
  const onScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    atBottomRef.current = near
    setAtBottom(near)
    if (near) setUnread(false)
  }
  const toBottom = (smooth = true) => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    atBottomRef.current = true
    setAtBottom(true)
    setUnread(false)
  }
  const last = items[items.length - 1]
  const lastIsMine = last?.kind === 'user'
  const lastKey = last ? `${last.id}:${last.kind}` : ''
  useEffect(() => {
    // Their own message always scrolls down (they just sent it); anything else only if they are following along.
    if (atBottomRef.current || lastIsMine) toBottom()
    else if (lastKey) setUnread(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, lastKey, prompt, suggestions.length, more.length, asking, callOffer])

  useEffect(() => {
    if (asking) inputRef.current?.focus()
  }, [asking])

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const value = text.trim()
    // While the counsellor is still answering, Enter waits (like the Send button): no double sends.
    if (!value || thinking) return
    setText('')
    onSend(value.slice(0, asking?.maxLength ?? 600))
  }

  /** Enter sends; Shift+Enter or Alt+Enter starts a new line (not for one-line answers like a name or email). */
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    if ((e.shiftKey || e.altKey) && !asking) {
      if (e.altKey) {
        e.preventDefault()
        const el = e.currentTarget
        const at = el.selectionStart ?? text.length
        const next = `${text.slice(0, at)}\n${text.slice(el.selectionEnd ?? at)}`
        setText(next)
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = at + 1 })
      }
      return
    }
    e.preventDefault()
    submit()
  }

  // The box grows with the text, up to about five lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [text])

  return (
    <section className="tc" aria-label={`Chat with ${nameOf(who)}, ${isBot ? 'your guide' : 'your career counsellor'}`}>
      <header className="tc-header">
        {openProfile && !isBot ? (
          <button type="button" className="tc-who-btn" onClick={() => openProfile(who)} aria-label={`View ${nameOf(who)}'s profile`} aria-expanded={profileOf === who}>
            <Avatar who={who} size={38} online />
            <span className="tc-who">
              <span className="tc-name"><b>{nameOf(who)}</b><span className="tc-badge">{COUNSELLOR_TITLE}</span></span>
              <span className="tc-status">
                {rating && rating.count >= 10 && <span className="tc-rating"><b>★ {rating.avg.toFixed(2)}</b> ({rating.count.toLocaleString('en-IN')} ratings) · </span>}
                Online · <u>View profile</u>
              </span>
            </span>
          </button>
        ) : (
          <>
            <Avatar who={who} size={38} online />
            <div className="tc-who">
              <div className="tc-name"><b>{nameOf(who)}</b><span className="tc-badge">{isBot ? GUIDE_TITLE : COUNSELLOR_TITLE}</span></div>
              <span className="tc-status">Online · {isBot ? 'virtual guide' : 'virtual counsellor'}</span>
            </div>
          </>
        )}
        <div className="tc-header-right">
          {headerRight}
          {onCall && (
            <button type="button" className="tc-call" data-tour="call" aria-label={`Get a call from ${isBot ? 'a Learnbay counsellor' : nameOf(who)}`} title="Get a call" onClick={onCall}>
              <Icon name="phone" size="1.1rem" /><span className="tc-call-label">Call me</span>
            </button>
          )}
        </div>
      </header>

      {profile && profileOf && (
        <>
          <div className="cp-backdrop" onClick={() => setProfileOf(null)} />
          {profile(profileOf, () => setProfileOf(null))}
        </>
      )}
      <div className="tc-body-wrap">
      <div className="tc-body" ref={bodyRef} aria-live="polite" onScroll={onScroll}>
        {items.map((item, i) => <Row key={item.id} item={item} prev={items[i - 1]} next={items[i + 1]} chat={chat} onLink={onLink} onWho={openProfile} />)}
        {/* Never an empty box while the chat loads or the first line is on its way: typing dots from the first moment. */}
        {!items.length && <Row item={{ id: 'loading', kind: 'typing', by: who } as Item} chat={chat} onLink={onLink} onWho={openProfile} />}

        {more.length > 0 && !asking && (
          <div className="tc-more" aria-label="Read more of this answer">
            <span className="tc-more-label"><Icon name="book" size="0.85rem" /> What would you like to see next?</span>
            <div className="tc-suggest">
              {more.map((m, i) => <button key={m.title} type="button" className="tc-chip tc-chip-more" onClick={() => void chat.readMore(i)}><Icon name="arrowRight" size="0.8rem" />{m.title}</button>)}
              {more.length > 1 && <button type="button" className="tc-chip tc-chip-soft" onClick={() => void chat.readMore('all')}>Show all</button>}
            </div>
          </div>
        )}

        {callOffer && !asking && onCall && (
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

        {prompt && <PromptView key={`${prompt.question ?? ''}|${prompt.choices.map((c) => c.id).join(',')}`} prompt={prompt} onPick={chat.pick} onPickMany={chat.pickMany} />}
      </div>
      {!atBottom && (
        <button type="button" className={`tc-jump${unread ? ' has-new' : ''}`} aria-label={unread ? 'New message: jump to the latest' : 'Jump to the latest message'} onClick={() => toBottom()}>
          <Icon name="chevronDown" size="1.2rem" />{unread && <i aria-hidden="true" />}
        </button>
      )}
      </div>

      {asking?.label && (
        <div className="tc-ask-label" aria-hidden="true">
          <Icon name="user" size="0.85rem" /><b>{asking.label}</b><span>· type below and press Enter</span>
        </div>
      )}
      <form className={`tc-composer${asking ? ' tc-composer-asking' : ''}`} onSubmit={submit}>
        <label className="sr-only" htmlFor="tc-input">{asking ? asking.label ?? asking.placeholder : 'Type your question'}</label>
        <textarea
          id="tc-input" ref={inputRef} value={text} rows={1} onKeyDown={onKey} autoComplete="off"
          onChange={(e) => setText(asking ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
          maxLength={asking?.maxLength ?? 600} inputMode={asking?.inputMode ?? 'text'}
          placeholder={asking ? asking.placeholder : 'Or type your question… (Shift+Enter for a new line)'}
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

function Row({ item, prev, next, chat, onLink, onWho }: { item: Item; prev?: Item; next?: Item; chat: ChatApi; onLink?: (href: string) => void; onWho?: (who: string) => void }) {
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
      <span className="tc-row-avatar">{first ? (onWho && by !== 'bot' ? <button type="button" className="tc-avatar-btn" onClick={() => onWho(by)} aria-label={`View ${nameOf(by)}'s profile`}><Avatar who={by} size={28} /></button> : <Avatar who={by} size={28} />) : null}</span>
      <div className="tc-row-main">
        {first && <span className="tc-speaker">{nameOf(by)}</span>}
        {item.kind === 'typing' && <div className="tc-bubble tc-typing" aria-label={`${nameOf(by)} is typing`}><i /><i /><i /></div>}
        {item.kind === 'bot' && (
          <div className={`tc-bubble tc-pop ${/\n\s*[-*•] /.test(item.text) ? 'tc-bubble-rich' : ''}`}>
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
  // Every option stays visible (people rarely open "show more"); long lists use a compact grid instead.
  const shown = prompt.choices
  const moreButton = null
  if (prompt.multi) {
    const toggle = (id: string) => setPicked((p) => (id === 'none' ? (p.includes('none') ? [] : ['none']) : p.includes(id) ? p.filter((x) => x !== id) : [...p.filter((x) => x !== 'none'), id]))
    return (
      <div className="tc-prompt">
        <div className="tc-chips">
          {shown.map((c) => <button key={c.id} type="button" className="tc-chip" aria-pressed={picked.includes(c.id)} onClick={() => toggle(c.id)}>{picked.includes(c.id) && <Icon name="check" size="0.85rem" />}{c.label}</button>)}
          {moreButton}
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
          {shown.map((c) => (
            <button key={c.id} type="button" className={`tc-chip ${c.id === 'call' ? 'tc-chip-call' : ''}`} onClick={() => onPick(c)}>
              {c.icon && <Icon name={c.icon} size="0.95rem" />}{c.label}
            </button>
          ))}
          {moreButton}
        </div>
      </div>
    )
  }
  return (
    <div className={`tc-prompt tc-choices${shown.length > 3 ? ' tc-choices-grid' : ''}`}>
      {shown.map((c, n) => (
        <button key={c.id} type="button" className={`tc-choice${n === 0 && c.id !== 'later' ? ' tc-choice-main' : ''}`} onClick={() => onPick(c)}>
          <span className="tc-choice-icon"><Icon name={c.icon ?? 'arrowRight'} size="1.2rem" /></span>
          <span className="tc-choice-text"><b>{c.label}</b>{c.hint && <small>{c.hint}</small>}</span>
          <Icon name="arrowRight" size="1.1rem" className="tc-choice-arrow" />
        </button>
      ))}
      {moreButton}
    </div>
  )
}
