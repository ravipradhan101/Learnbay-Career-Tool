// Guardrails on every counsellor answer before the learner sees it. Each check compares the answer with Learnbay's own
// data (the 2026 catalogue, the learner's calculated path and entry rules) or with claims Learnbay never makes (from the
// catalogue's "fixes that apply to every brochure"). A failed answer is rewritten once by the AI with the reasons;
// if it still fails, the exact answer computed from the data is used instead (lib/knowledge factsFor).

import { CATALOGUE, CODE_TO_ID, catalogueProgram } from '@/config/catalogue'
import { getProgram } from '@/config/programs'
import { eligibility } from './lead-match'
import type { Answers } from './questions'

export type Violation = { rule: string; detail: string }

const PROGRAM_NAMES = CATALOGUE.programs.map((p) => ({ id: CODE_TO_ID[p.code], code: p.code, name: p.name, months: p.durationMonths, weeks: p.totalWeeks, certs: p.certificates }))
// Short forms people (and models) use for the programs, so a "6 months" next to "the analytics program" is checked too.
const ALIASES: Record<string, RegExp> = {
  AAP: /applied ai practitioner/i,
  DABA: /data (&|and) business analytics/i,
  'DSG-C': /data science (&|and) genai program\b(?! master)/i,
  'DSG-M': /data science (&|and) genai master/i,
  'GAI-SD': /genai (&|and) agentic ai for software developers/i,
  'SDE-M': /sde master/i,
  'FDE-M': /forward deployed ai engineer(ing)? master/i,
  AIE: /(?<!deployed )\bai engineer(ing)? master( certification)?( program)?\b/i,
  'GAI-M': /genai (&|and) agentic ai master/i,
  'GAI-CD': /genai (&|and) agentic ai for cloud/i,
  CD: /cloud (&|and) devops engineering(?! master)/i,
  'CD-M': /ai-powered cloud (&|and) devops master/i,
  AIL: /ai leadership program/i,
  MCS: /master'?s degree in cs|woolf/i,
}

const sentences = (text: string) => text.replace(/\n+/g, ' . ').split(/(?<=[.!?])\s+/)

/** Programs a sentence names (by catalogue name or a clear short form). */
function programsIn(sentence: string) {
  return PROGRAM_NAMES.filter((p) => sentence.toLowerCase().includes(p.name.toLowerCase()) || ALIASES[p.code]?.test(sentence))
}

// Old program names (the catalogue's "Old programs → new catalogue"): the counsellor explains the change, never uses them as current.
const RETIRED: RegExp[] = [
  /genai (&|and) agentic ai certification program/i,
  /advanced cloud (&|and) devops (certification )?program/i,
  /cloud (&|and) devops for (it support|itops|system admin|sysadmin|dba|database|network|qa)/i,
  /data science (&|and) ai (foundation|for freshers|master certification|for bfsi|for managers)/i,
  /advanced (ds|data science) (&|and) ai\b/i,
  /\b(hr|marketing) analytics program\b/i,
  /business analytics master/i,
]

// Claims Learnbay never makes (catalogue "Claims", "Certificates" and "Real company names" fixes, and the counsellor rules).
const NEVER: [RegExp, string][] = [
  [/\b(guarantee[ds]?|guaranteed|assured (job|placement)|100% (placement|job|interview))/i, 'Promises a job, placement or outcome'],
  [/\b\d{2,3}\s?%\s?(salary )?(hike|increase|higher salar|jump)/i, 'Quotes a salary hike percentage'],
  [/faang mentors?/i, 'Claims FAANG mentors'],
  [/(₹|rs\.?|inr)\s?\d[\d,]*(\s?(lakh|l|k))?[^.]{0,40}\b(fees?|cost|price|emi)\b|\b(fees?|cost|price|emi)\b[^.]{0,40}(₹|rs\.?|inr)\s?\d/i, 'States a fee amount'],
  [/\b\d{1,2}\s?% (off|discount|scholarship)/i, 'States a discount amount'],
  [/\b(busy right now|i am busy|i'?m busy|get back to you later)\b/i, 'Says the counsellor is busy'],
  [/\b(log ?in again|sign in again|please (log|sign) ?in)\b/i, 'Asks the learner to log in'],
  [/\b(needs?|requires?|minimum( of)?|at least) (8|10)\+? years/i, 'States a leadership-years myth (the rule is 2+ years)'],
  [/connect(s|ing)? you (to|with) (companies|recruiters)|companies (that are )?open to hiring/i, 'Implies placement with specific companies'],
]

/**
 * What is wrong with an answer, if anything. `focus`: the program the answer should be about (the one they asked
 * about, else their recommended one); `allowed`: other programs it may name (their path, the one they asked about).
 */
export function checkAnswer(text: string, opts: { focus: string | null; allowed: string[]; answers?: Answers; intent: string }): Violation[] {
  const out: Violation[] = []
  const add = (rule: string, detail: string) => { if (!out.some((v) => v.rule === rule)) out.push({ rule, detail }) }
  // Sentence by sentence, so "nobody can guarantee a job" (an honest no) is never read as a promise.
  const NEGATED = /\b(no|not|nobody|never|can'?t|cannot|don'?t|doesn'?t|won'?t|isn'?t|without)\b/i
  for (const s of sentences(text)) {
    for (const [re, rule] of NEVER) {
      const m = s.match(re)
      if (m && !(rule.startsWith('Promises') && NEGATED.test(s))) add(rule, m[0])
    }
  }
  for (const re of RETIRED) { const m = text.match(re); if (m && !/(now|replaced|no longer|is part of|has become|merged)/i.test(text)) add('Uses a retired program name as current', m[0]) }
  for (const s of sentences(text)) {
    const named = programsIn(s)
    // Durations: "N months" / "N weeks" next to exactly one program must be that program's duration.
    if (named.length === 1) {
      const p = named[0]
      const months = [...s.matchAll(/\b(\d{1,2})\s?(?:-| )?months?\b/gi)].map((m) => Number(m[1]))
      const weeks = [...s.matchAll(/\b(\d{1,2})\s?weeks?\b/gi)].map((m) => Number(m[1]))
      // Only a statement of the program's length counts ("runs 6 months"), not a part of it ("12 weeks of DSA").
      const isLength = /\b(runs?|lasts?|long|duration|in total|overall|complete it in|finish it in|program is \d)\b/i.test(s)
      if (isLength && p.months && months.some((n) => n !== p.months)) add('Wrong duration', `${p.name} runs ${p.months} months, not ${months.find((n) => n !== p.months)}`)
      if (isLength && p.weeks && weeks.length && !weeks.includes(p.weeks)) add('Wrong duration', `${p.name} runs ${p.weeks} weeks`)
      // Certificates named next to a program must be ones it gives.
      if (/iit patna/i.test(s) && !/iit patna/i.test(p.certs)) add('Wrong certificate', `${p.name} does not give an IIT Patna certificate`)
      if (/\bibm\b/i.test(s) && /certif/i.test(s) && !/ibm/i.test(p.certs)) add('Wrong certificate', `${p.name} does not give an IBM certificate`)
    }
    // A vendor certificate (Microsoft, AWS, Google) only for a program whose catalogue lists it.
    const cert = s.match(/\b(microsoft|aws|google)\b[^.]{0,40}certif|certif\w*[^.]{0,40}\b(microsoft|aws|google)\b/i)
    const certProgram = named.length === 1 ? named[0] : PROGRAM_NAMES.find((p) => p.id === opts.focus)
    if (cert && certProgram && !/\b(not|no|isn'?t|doesn'?t)\b/i.test(s)) {
      const vendor = (cert[1] ?? cert[2]).toLowerCase()
      if (!certProgram.certs.toLowerCase().includes(vendor)) add('Wrong certificate', `${certProgram.name} does not include a ${vendor[0].toUpperCase()}${vendor.slice(1)} certificate (it gives: ${certProgram.certs})`)
    }
    // Recommending a program other than theirs (or one on their path / the one they asked about).
    if (/\b(fits? you|best fit|great fit|good fit|right (one|program|choice) for you|recommend|suits? you|perfect for you|ideal for you)\b/i.test(s)) {
      for (const p of named) if (p.id !== opts.focus && !opts.allowed.includes(p.id)) add('Recommends a program off their path', p.name)
    }
  }
  // Eligibility: "you're eligible" only when the entry rules say so without anything left to confirm.
  if (opts.focus && opts.answers && /\byou('re| are) (definitely |fully |already )?(eligible|qualified)\b|\byou (definitely |fully )?(qualify|meet (all|the) (entry|requirement))/i.test(text)) {
    const e = eligibility(opts.focus, opts.answers)
    if (!e.ok) add('Wrong eligibility', `${getProgram(opts.focus).name}: ${e.reason}`)
    else if (e.confirm) add('Eligibility needs confirming', `${getProgram(opts.focus).name} ${e.confirm}`)
  }
  return out
}

/** The reasons, as an instruction for the rewrite. */
export function rewriteNote(v: Violation[]): string {
  return `\n\nYOUR DRAFT FAILED LEARNBAY'S CHECKS. Rewrite it so none of these happen again, keeping everything else:\n${v.map((x) => `- ${x.rule}: ${x.detail}`).join('\n')}`
}

/** Removes the sentences that break a rule, when nothing better is available. */
export function stripViolations(text: string, v: Violation[]): string {
  const bad = v.map((x) => x.detail.toLowerCase()).filter((d) => d.length > 3)
  const keep = text.split('\n').map((line) => sentences(line).filter((s) => !bad.some((d) => s.toLowerCase().includes(d.slice(0, 24))) && !NEVER.some(([re]) => re.test(s))).join(' ')).filter((l) => l.trim())
  return keep.join('\n')
}

export const programCode = (id: string | null | undefined) => (id ? catalogueProgram(id)?.code ?? null : null)
