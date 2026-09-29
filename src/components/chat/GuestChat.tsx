'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '../Icon'
import { ChatWindow } from './ChatWindow'
import { matchTyped, useChat } from './engine'
import { GUEST_ITEMS_KEY, PENDING_Q_KEY, guestFlow, loginFlow, type GuestCtx } from './flows'
import { sessionSet as storageSet } from '@/lib/client'
import type { Answers } from '@/lib/questions'

export const LOGIN_EVENT = 'lcn:chat-login'

/** Richa, the career guide: a few questions, sign-up with an email code, then she finds the right counsellor. */
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
    if (chat.prompt) {
      const local = matchTyped(text, chat.prompt)
      if (local) { chat.userSays(text); chat.pickTyped(local); return }
    }
    // Questions typed before sign-up are answered by the counsellor right after.
    chat.userSays(text)
    storageSet(PENDING_Q_KEY, text)
    chat.note(chat.prompt ? 'Good question. Your counsellor will answer that in detail in a moment. For now, just tap the option that fits best below.' : 'Good question. Your counsellor will answer that in detail in a moment; let me just finish a couple of quick steps.')
  }

  return (
    <ChatWindow
      chat={chat}
      onSend={onSend}
      footer={<><Icon name="lock" size="0.85rem" /> Private · Takes about 2 minutes · Free</>}
    />
  )
}
