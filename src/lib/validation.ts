import { MAP_ANSWER_OPTIONS } from '@/config/map-questions'
import { PROGRAMS } from '@/config/programs'
import { ALL_PROBES, ALL_TRIGGERS, STUDY_STAGES } from './segments'
import {
  CITIES, CTC_BANDS, DIFFICULTIES, DOMAINS, EXPERIENCE, GOALS, INTERESTS, LEARNING_SOURCES, SKILL_LEVELS, PROGRAMMER, ROLES, ROLE_OTHER, SKILLS, SKILL_NONE, TARGET_NOT_SURE, TARGET_ROLES,
  TIMELINES, WEEKLY_HOURS, COMPANY_TYPES, EDU_LEVELS, MATH_COMFORT, isValidPhone, type Answers, type Option,
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
  set('goal', pickOne(GOALS, a.goal))
  set('domain', pickOne(DOMAINS, a.domain))
  if (out.domain === 'other') {
    const other = cleanText(a.domainOther, 60)
    if (other) out.domainOther = other
  }
  set('studyStage', pickOne(STUDY_STAGES, a.studyStage))
  if (typeof a.program === 'string' && PROGRAMS.some((p) => p.id === a.program)) out.program = a.program
  set('companyType', pickOne(COMPANY_TYPES, a.companyType))
  set('trigger', pickOne(ALL_TRIGGERS, a.trigger))
  set('probe', pickOne(ALL_PROBES, a.probe))
  set('learning', pickOne(LEARNING_SOURCES, a.learning))
  if (a.mapAnswers && typeof a.mapAnswers === 'object' && !Array.isArray(a.mapAnswers)) {
    const answers: Record<string, string> = {}
    for (const [k, v] of Object.entries(a.mapAnswers as Record<string, unknown>)) {
      if (typeof v === 'string' && MAP_ANSWER_OPTIONS[k]?.includes(v)) answers[k] = v
    }
    if (Object.keys(answers).length) out.mapAnswers = answers
  }
  set('difficulty', pickOne(DIFFICULTIES, a.difficulty))
  if (a.skillLevels && typeof a.skillLevels === 'object' && !Array.isArray(a.skillLevels)) {
    const levels: Record<string, string> = {}
    for (const [k, v] of Object.entries(a.skillLevels as Record<string, unknown>)) {
      if (SKILLS.some((s) => s.id === k) && SKILL_LEVELS.some((l) => l.id === v)) levels[k] = v as string
    }
    if (Object.keys(levels).length) out.skillLevels = levels
  }
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
  // Free text in their own words (kept short; never shown to anyone else as is).
  const tools = cleanText(a.toolsUsed, 160)
  if (tools) out.toolsUsed = tools
  const problem = cleanText(a.workProblem, 240)
  if (problem) out.workProblem = problem
  if (a.deepDive === 'done' || a.deepDive === 'skipped') out.deepDive = a.deepDive
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
