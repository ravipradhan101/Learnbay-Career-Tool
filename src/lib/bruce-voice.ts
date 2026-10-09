'use client'

// Bruce's voice: the browser's own speech (no downloads, no cost per line). Off until the learner turns it on (the
// choice is remembered on this device); every line Bruce says is spoken while it is on.
// Voices differ a lot between devices, so the best one is picked automatically: the natural ("Online (Natural)",
// neural, Google) voices first, and Edge's natural child voice (Ana) above all, which suits a little sapling. The
// learner can switch to another voice with "Change voice" (remembered too). Lines are spoken a sentence at a time,
// which sounds smoother and avoids Chrome cutting off long speech.

const KEY = 'lcn_bruce_voice'
const VOICE_KEY = 'lcn_bruce_voice_name'
export const VOICE_EVENT = 'lcn:bruce-voice'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* private mode: this visit only */ } },
}

export function voiceOn(): boolean {
  return canSpeak() && store.get(KEY) === '1'
}

export function setVoiceOn(on: boolean) {
  store.set(KEY, on ? '1' : '0')
  if (!on) stopSpeaking()
  window.dispatchEvent(new CustomEvent(VOICE_EVENT, { detail: on }))
}

const natural = (v: SpeechSynthesisVoice) => /natural|neural|online/i.test(v.name)
/** Higher is better: natural voices first (Edge's child voice Ana top), then Google's, Indian/British/US English. */
function score(v: SpeechSynthesisVoice) {
  return (/\bana\b/i.test(v.name) && natural(v) ? 40 : 0)
    + (natural(v) ? 20 : 0)
    + (/google/i.test(v.name) ? 12 : 0)
    + (/en[-_]IN/i.test(v.lang) ? 4 : /en[-_]GB/i.test(v.lang) ? 3 : /en[-_]US/i.test(v.lang) ? 2 : 0)
    // Old desktop voices sound robotic.
    - (/zira|david|mark|hazel|heera|ravi|george|susan/i.test(v.name) && !natural(v) ? 6 : 0)
}

/** The English voices worth offering, best first (at most 6). */
export function voiceOptions(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return []
  return window.speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang)).sort((a, b) => score(b) - score(a)).slice(0, 6)
}

function pickVoice(): SpeechSynthesisVoice | null {
  const options = voiceOptions()
  const chosen = store.get(VOICE_KEY)
  return options.find((v) => v.name === chosen) ?? options[0] ?? window.speechSynthesis.getVoices()[0] ?? null
}

/** Switches to the next good voice and says hello in it. Returns its short name (e.g. "Ana", "Google UK English"). */
export function nextVoice(): string | null {
  const options = voiceOptions()
  if (!options.length) return null
  const current = pickVoice()
  const next = options[(options.findIndex((v) => v.name === current?.name) + 1) % options.length]
  store.set(VOICE_KEY, next.name)
  return shortName(next)
}
export const shortName = (v: SpeechSynthesisVoice) => v.name.replace(/^Microsoft\s+/i, '').replace(/\s+Online.*$|\s+-\s+.*$|\s*\(.*\)$/g, '').trim()
export function currentVoiceName(): string | null { const v = canSpeak() ? pickVoice() : null; return v ? shortName(v) : null }

/** Text as it should sound: no emojis or symbols read out, "AI" spelt as letters, ₹ as rupees. */
function forSpeech(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[*_#>`~|]/g, '')
    .replace(/₹\s?([\d,.]+)/g, '$1 rupees')
    .replace(/\bAI\b/g, 'A.I.')
    .replace(/\bLPA\b/g, 'lakhs per year')
    .replace(/→/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim()
}
/** Sentences (long ones split at commas), so speech flows and never hits a browser's time limit. */
function sentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]*["”’)]*\s*/g) ?? [text])
    .flatMap((s) => (s.length > 180 ? s.split(/(?<=,)\s+/) : [s]))
    .map((s) => s.trim()).filter(Boolean)
}

let current = 0

/**
 * Speaks a line (if the voice is on). `onTalk(true)` when he starts, `onTalk(false)` when he finishes, so his mouth
 * moves while he talks. A new line interrupts the previous one.
 */
export function speak(text: string, onTalk?: (talking: boolean) => void, force = false): void {
  if ((!voiceOn() && !force) || !text.trim() || !canSpeak()) return
  const synth = window.speechSynthesis
  const id = ++current
  synth.cancel()
  const run = () => {
    if (id !== current) return
    const v = pickVoice()
    const parts = sentences(forSpeech(text))
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part)
      if (v) { u.voice = v; u.lang = v.lang }
      // A young, bright voice: a child voice as it is, natural voices lifted a little, robotic ones a little more.
      u.pitch = v && /\bana\b/i.test(v.name) ? 1.05 : v && (natural(v) || /google/i.test(v.name)) ? 1.2 : 1.35
      u.rate = 0.98
      u.volume = 1
      if (i === 0) u.onstart = () => { if (id === current) onTalk?.(true) }
      if (i === parts.length - 1) u.onend = () => { if (id === current) onTalk?.(false) }
      u.onerror = () => { if (id === current) onTalk?.(false) }
      synth.speak(u)
    })
  }
  // Some browsers load their voices a moment after the page.
  if (synth.getVoices().length) run()
  else {
    const once = () => { synth.removeEventListener('voiceschanged', once); run() }
    synth.addEventListener('voiceschanged', once)
    window.setTimeout(once, 600)
  }
}

export function stopSpeaking() {
  current++
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}
