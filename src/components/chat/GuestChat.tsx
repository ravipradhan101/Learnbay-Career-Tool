'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '../Icon'
import { ChatWindow } from './ChatWindow'
import { looksLikeGibberish, looksLikeQuestion, matchTyped, otherAnswer, useChat } from './engine'
import { GUEST_ITEMS_KEY, PENDING_Q_KEY, guestFlow, loginFlow, type GuestCtx } from './flows'
import { sessionSet as storageSet } from '@/lib/client'
import type { Answers } from '@/lib/questions'

export const LOGIN_EVENT = 'lcn:chat-login'

/** Lumi, the career guide: a few questions, sign-up with an email code, then she finds the right counsellor. */
export function GuestChat({ signedIn, initial, track, mode }: { signedIn: GuestCtx['signedIn']; initial: Answers; track: string | null; mode: 'start' | 'login' }) {
  const chat = useChat({ storageKey: GUEST_ITEMS_KEY, signedIn: false, speaker: 'bot' })
  const started = useRef(false)

  useEffect(() => {
    if (!chat.restored || started.current) return
    started.current = true
    const ctx: GuestCtx = { signedIn, initial, fresh: chat.items.length === 0, track }
    chat.run((bot) => (mode === 'login' ? loginFlow(bot, ctx) : guestFlow(bot, ctx)))
  }, [chat, chat.restored, initial, signedIn, track, mode])

  // A "Log in" button elsewhere on the page can open the login inside the chat.
  useEffect(() => {
    const open = () => chat.run((bot) => loginFlow(bot, { signedIn, initial, fresh: false, track }))
    window.addEventListener(LOGIN_EVENT, open)
    return () => window.removeEventListener(LOGIN_EVENT, open)
  }, [chat, initial, signedIn, track])

  function onSend(text: string) {
    if (chat.answer(text)) return
    const prompt = chat.prompt
    // A typed answer: one of the options ("5" → 3–5 years, "fintech" → Banking), or their own words where the
    // question takes them ("Logistics" → Other: Logistics).
    if (prompt) {
      const local = matchTyped(text, prompt) ?? (looksLikeGibberish(text) ? null : otherAnswer(text, prompt))
      if (local) { chat.userSays(text); chat.pickTyped(local); return }
    }
    chat.userSays(text)
    if (looksLikeGibberish(text)) {
      chat.note(prompt ? 'Sorry, I didn’t quite catch that. Tap the option that fits you best below, or type your answer in a few words.' : 'Sorry, I didn’t quite catch that. Could you type it again?')
      return
    }
    if (looksLikeQuestion(text)) {
      // Questions typed before sign-up are answered by the counsellor right after.
      storageSet(PENDING_Q_KEY, text)
      chat.note(prompt ? 'Good question! Your counsellor will answer it right after this step. For now, pick the option below that fits you best.' : 'Good question! Your counsellor will answer it in detail in a moment; let me just finish a couple of quick steps.')
      return
    }
    // An answer that isn't one of the options: say so plainly, and keep the same options on screen.
    const said = text.length > 40 ? `${text.slice(0, 40)}…` : text
    chat.note(prompt
      ? `I couldn’t match “${said}” to one of these options. Please tap the one closest to you below${prompt.other ? ', or “Other”' : ''}.`
      : 'Thanks! Let me just finish a couple of quick steps.')
  }

  return (
    <ChatWindow
      chat={chat}
      onSend={onSend}
      footer={<><Icon name="lock" size="0.85rem" /> Private · Takes about 2 minutes · Free</>}
    />
  )
}
