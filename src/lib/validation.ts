import {
  CITIES, CTC_BANDS, EXPERIENCE, INTERESTS, PROGRAMMER, ROLES, ROLE_OTHER, SKILLS, SKILL_NONE, TARGET_NOT_SURE, TARGET_ROLES,
  TIMELINES, WEEKLY_HOURS, EDU_LEVELS, MATH_COMFORT, isValidPhone, type Answers, type Option,
} from './questions'
import { cleanText, normalizeEmail } from './security'

function pickOne(options: Option[], value: unknown, extra: string[] = []): string | undefined {
  if (typeof value !== 'string') return undefined
  return options.some((o) => o.id === value) || extra.includes(value) ? value : undefined
}

/**
 * Keeps only known option ids from untrusted input. Missing keys stay missing, so the result can be
 * merged onto existing answers without overwriting them.
 */
export function sanitizeAnswers(input: unknown): Answers {
  const a = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out: Answers = {}
  const role = pickOne(ROLES, a.role, [ROLE_OTHER])
  if (role) out.role = role
  if (role === ROLE_OTHER) {
    const other = cleanText(a.roleOther, 60)
    if (other) out.roleOther = other
  }
  const set = <K extends keyof Answers>(key: K, value: Answers[K] | undefined) => { if (value !== undefined) out[key] = value }
  set('experience', pickOne(EXPERIENCE, a.experience))
  set('programmer', pickOne(PROGRAMMER, a.programmer))
  set('interest', pickOne(INTERESTS, a.interest))
  set('targetRole', pickOne(Object.values(TARGET_ROLES).flat(), a.targetRole, [TARGET_NOT_SURE]))
  if (Array.isArray(a.skills)) {
    const allowed = new Set([...SKILLS.map((s) => s.id), SKILL_NONE])
    let skills = [...new Set(a.skills.filter((s): s is string => typeof s === 'string' && allowed.has(s)))].slice(0, 20)
    if (skills.includes(SKILL_NONE)) skills = [SKILL_NONE]
    if (skills.length) out.skills = skills
  }
  set('ctc', pickOne(CTC_BANDS, a.ctc))
  set('city', pickOne(CITIES, a.city))
  set('weeklyHours', pickOne(WEEKLY_HOURS, a.weeklyHours))
  set('timeline', pickOne(TIMELINES, a.timeline))
  set('eduLevel', pickOne(EDU_LEVELS, a.eduLevel))
  set('mathComfort', pickOne(MATH_COMFORT, a.mathComfort))
  return out
}

/** New answers only fill gaps: anything already answered stays as it was (profiles are locked). */
export function mergeAnswers(existing: Answers, incoming: Answers): Answers {
  const merged: Answers = { ...existing }
  for (const [k, v] of Object.entries(incoming) as [keyof Answers, Answers[keyof Answers]][]) {
    const cur = merged[k]
    const empty = cur === undefined || (Array.isArray(cur) && cur.length === 0)
    if (empty && v !== undefined) (merged as Record<string, unknown>)[k] = v
  }
  return merged
}

export type Contact = { name: string; email: string; phoneCountry: string; phone: string; consent: boolean }

export function validateContact(input: unknown): { contact?: Contact; error?: string } {
  const c = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const name = cleanText(c.name, 80)
  if (name.length < 2 || !/[\p{L}]/u.test(name)) return { error: 'Please enter your full name.' }
  const email = normalizeEmail(c.email)
  if (!email) return { error: 'Please enter a valid email address.' }
  const phoneCountry = typeof c.phoneCountry === 'string' ? c.phoneCountry : ''
  const phone = typeof c.phone === 'string' ? c.phone.replace(/[\s-]/g, '') : ''
  if (!isValidPhone(phoneCountry, phone)) return { error: 'Please enter a valid phone number.' }
  if (c.consent !== true) return { error: 'Please agree to receive your insights so we can send them to you.' }
  return { contact: { name, email, phoneCountry, phone, consent: true } }
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'there'
}
