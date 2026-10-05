'use client'

import { useEffect, useRef } from 'react'

const AWAY_MS = 15_000
const MAX_ALERTS = 3

/**
 * The learner switched to another tab or app: after 15 seconds away, a soft chime, a blinking tab title and (if they
 * allowed it) a desktop notification bring them back. Once per absence, at most three times a visit.
 */
export function useAwayAlert({ enabled, title, body }: { enabled: boolean; title: () => string; body: () => string }) {
  const text = useRef({ title, body })
  text.current = { title, body }

  useEffect(() => {
    if (!enabled) return
    let timer: number | null = null
    let blink: number | null = null
    let restore = ''
    let alerts = 0
    let audio: AudioContext | null = null

    // Browsers only allow sound after the person has interacted with the page, so the audio starts on their first tap.
    const unlock = () => {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!audio && AC) audio = new AC()
        if (audio?.state === 'suspended') void audio.resume()
      } catch { /* no sound on this device */ }
    }
    const chime = () => {
      if (!audio) return
      const now = audio.currentTime
      for (const [freq, at] of [[880, 0], [1320, 0.16]] as const) {
        const osc = audio.createOscillator()
        const gain = audio.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, now + at)
        gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.45)
        osc.connect(gain).connect(audio.destination)
        osc.start(now + at)
        osc.stop(now + at + 0.5)
      }
    }
    const fire = () => {
      timer = null
      if (alerts >= MAX_ALERTS) return
      alerts++
      chime()
      restore = document.title
      let on = false
      blink = window.setInterval(() => { on = !on; document.title = on ? `🔔 ${text.current.title()}` : restore }, 1000)
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(text.current.title(), { body: text.current.body(), icon: '/icon.svg', tag: 'lcn-away' })
          n.onclick = () => { window.focus(); n.close() }
        }
      } catch { /* notifications unavailable */ }
    }
    const away = () => { if (timer === null && blink === null) timer = window.setTimeout(fire, AWAY_MS) }
    const back = () => {
      if (timer !== null) { window.clearTimeout(timer); timer = null }
      if (blink !== null) { window.clearInterval(blink); blink = null; document.title = restore }
    }
    const onVisibility = () => (document.hidden ? away() : back())

    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', away)
    window.addEventListener('focus', back)
    return () => {
      back()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', away)
      window.removeEventListener('focus', back)
      void audio?.close().catch(() => {})
    }
  }, [enabled])
}

/** Asks for desktop notifications (only from a tap, as browsers require). */
export async function askForNotifications(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export const canAskForNotifications = () => {
  try { return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' } catch { return false }
}
