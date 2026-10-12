'use client'

// Bruce's voice: the browser's own speech (no downloads, no cost per line). Off until the learner turns it on (the
// choice is remembered on this device); every line Bruce says is spoken while it is on.
// Bruce has a male voice. Voices differ a lot between devices, so the best male English voice is picked
// automatically: natural ("Online (Natural)", neural) voices first, Indian English first (Edge: Prabhat; then Guy,
// Andrew, Brian…; Chrome: Google UK English Male). "Change voice" moves through the other male voices (remembered).
// Lines are spoken a sentence at a time, which sounds smoother and avoids Chrome cutting off long speech.

const KEY = 'lcn_bruce_voice'
// A new key: choices saved before Bruce had a male voice (e.g. the child voice) are not reused.
const VOICE_KEY = 'lcn_bruce_voice_male'
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
const MALE = /\b(male|prabhat|guy|andrew|brian|christopher|eric|roger|steffan|davis|jason|tony|ryan|thomas|william|liam|connor|mitchell|neil|ravi|david|mark|george|daniel|rishi|james|alex|fred|oliver|arthur|aaron|reed|ralph)\b/i
const FEMALE = /\b(female|ana|aria|jenny|michelle|emma|ava|libby|sonia|neerja|heera|zira|hazel|susan|samantha|karen|moira|tessa|natasha|clara|emily|sara|jane|nancy|kate|victoria|fiona|serena|veena|isha)\b/i
const isMale = (v: SpeechSynthesisVoice) => MALE.test(v.name) && !FEMALE.test(v.name)
/** Higher is better: male first, then natural voices, then Indian/British/US English. */
function score(v: SpeechSynthesisVoice) {
  return (isMale(v) ? 40 : 0)
    + (natural(v) ? 20 : 0)
    + (/google/i.test(v.name) ? 8 : 0)
    + (/en[-_]IN/i.test(v.lang) ? 4 : /en[-_]GB/i.test(v.lang) ? 3 : /en[-_]US/i.test(v.lang) ? 2 : 0)
    // Old desktop voices sound robotic.
    - (/david|mark|ravi|george/i.test(v.name) && !natural(v) ? 6 : 0)
}

/** The English voices worth offering, best first (at most 6): only male voices when the device has any. */
export function voiceOptions(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return []
  const en = window.speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang)).sort((a, b) => score(b) - score(a))
  const male = en.filter(isMale)
  return (male.length ? male : en).slice(0, 6)
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
      // A warm, friendly male voice: natural voices as they are, the others a touch brighter.
      u.pitch = v && natural(v) ? 1.0 : 1.08
      u.rate = 1.0
      u.volume = 1
      if (i === 0) u.onstart = () => { if (id === current) onTalk?.(true) }
      if (i === parts.length - 1) u.onend = () => { if (id === current) onTalk?.(false) }
      u.onerror = () => { if (id === current) onTalk?.(false) }
      synth.speak(u)
    })
  }
  // Some browsers load their voices a moment after the page: wait for them (or 600 ms), and speak only ONCE — the
  // "voices ready" event and the fallback timer used to both fire and say the first line twice.
  if (synth.getVoices().length) run()
  else {
    let done = false
    const once = () => { if (done) return; done = true; synth.removeEventListener('voiceschanged', once); run() }
    synth.addEventListener('voiceschanged', once)
    window.setTimeout(once, 600)
  }
}

export function stopSpeaking() {
  current++
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}
