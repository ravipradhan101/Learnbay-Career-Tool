'use client'

import { useEffect, useState } from 'react'
import { AssistantChat } from './AssistantChat'
import { Icon } from './Icon'
import { Sparkle } from './Sparkle'
import { BotIcon } from './BotIcon'
import { OPEN_ASSISTANT_EVENT } from '@/lib/track'

const HOME_SUGGESTIONS = ['What can this tool do for me?', 'How much can an AI Engineer earn?', 'Which program fits a QA engineer?']
const STUDIO_SUGGESTIONS = ['Where do I see my salary benchmark?', 'What should I check first?', 'How do I book a mentor session?']

/** Bottom-right AI assistant. On the home page it helps visitors; inside the studio it also navigates. */
export function FloatingAssistant({ signedIn, context = signedIn ? 'advisor' : 'home' }: { signedIn: boolean; context?: 'home' | 'advisor' }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState<string | null>(null)
  const [reset, setReset] = useState(0)

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true)
      const q = (e as CustomEvent<{ question?: string }>).detail?.question
      if (q) setQuestion(q)
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" className={`fab fab-bot no-print${open ? ' is-open' : ''}`} aria-label={open ? 'Close Career AI' : 'Chat with Career AI'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <Icon name="x" size="1.5rem" /> : <><span className="bot-avatar" aria-hidden="true"><BotIcon size="1.15rem" /></span><span className="fab-label">Ask Career AI</span></>}
        {!open && <span className="fab-badge" aria-hidden="true"><Sparkle size="0.85rem" /></span>}
      </button>
      <div className="assistant-panel no-print" role="dialog" aria-label="Career AI assistant" hidden={!open}>
        <div className="panel-head">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="bot-avatar lg" aria-hidden="true"><BotIcon size="1.4rem" /></span>
            <div>
              <b>Ask Career AI</b>
              <span className="panel-status">Learnbay AI assistant</span>
            </div>
          </div>
          <div className="row" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
            <button type="button" className="icon-btn" aria-label="New conversation" onClick={() => setReset((n) => n + 1)}><Icon name="plus" /></button>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}><Icon name="x" /></button>
          </div>
        </div>
        <AssistantChat
          context={context}
          signedIn={signedIn}
          scrollBody
          greeting={signedIn
            ? 'Hi! I can answer career questions and take you to the right tool: skill gaps, salaries, your roadmap or a mentor session.'
            : 'Hi! I’m Learnbay’s Career AI. Ask me about AI careers, skills or salaries, or I can start your free analysis.'}
          suggestions={signedIn ? STUDIO_SUGGESTIONS : HOME_SUGGESTIONS}
          placeholder="Ask about your career..."
          autoQuestion={question}
          newChatSignal={reset}
          onNavigate={() => setOpen(false)}
        />
      </div>
    </>
  )
}
