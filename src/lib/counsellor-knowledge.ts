// What the AI counsellors know about Learnbay's programs, from the 2026 catalogue (the Lead–Course Map): every program
// with who it is for, entry rule, duration, coding, roles and certificates; the routing rules and lead types; and, for
// one learner, their route, the syllabus of their program and its projects. Fees are never included.

import { CATALOGUE, catalogueProgram, personaById } from '@/config/catalogue'
import { PROGRAM_DETAILS } from '@/config/program-details'
import { PROGRAMS, cloudTrackFor, getProgram } from '@/config/programs'
import { trackOf, type Answers } from './questions'
import { eligibility, programForLearner } from './segments'
import { pathFor } from './lead-match'
import { MAP_QUESTIONS } from '@/config/map-questions'

const CODING_TEXT = { no: 'no coding', some: 'coding taught from scratch (no prior coding needed)', yes: 'for people who already write code' } as const
const nameOf = (code: string | null | undefined) => (code ? getProgram(PROGRAMS.find((p) => p.code === code)?.id).name : '')

/** One line per program: the facts the counsellor may state. */
export function catalogueBrief(): string {
  return PROGRAMS.map((p) => {
    const c = catalogueProgram(p.code)!
    const length = c.durationMonths ? `${c.durationMonths} months (${c.totalWeeks} weeks)` : 'duration confirmed by a Senior Counsellor'
    const specs = c.specialisations.length ? ` Specialisations / tracks: ${c.specialisations.map((s) => s.name).join(', ')}.` : ''
    return `- ${p.id} = ${c.name} [${c.family}; ${length}; ${CODING_TEXT[p.coding]}]. For: ${c.whoFor.join('; ')}. Not for: ${c.notFor.join('; ')}. Entry: ${c.entry} Leads to: ${c.targetRoles.join(', ')}. Certificates: ${c.certificates}.${specs}`
  }).join('\n')
}

/** One short line per program (name, family, length, coding, entry): the full detail comes from the knowledge base. */
export function catalogueIndex(): string {
  return PROGRAMS.map((p) => {
    const c = catalogueProgram(p.code)!
    return `- ${p.id} = ${c.name} [${c.family}; ${c.durationMonths ? `${c.durationMonths} months` : 'degree'}; ${CODING_TEXT[p.coding]}]. Entry: ${c.entry}`
  }).join('\n')
}

/** Learnbay's entry and routing rules, in the order to apply them. */
export function routingRules(): string {
  return `ENTRY RULES (Learnbay's own; apply them exactly, never soften or tighten them):
- Freshers and students (0 years of work experience) can join ONLY the three fresher programs: ${nameOf('AAP')}, ${nameOf('DABA')} and ${nameOf('DSG-C')}. No work experience is needed for these.
- Every other program needs at least 1 year of work experience. CODING: every AI & Data Science program teaches coding from scratch, so no coding background is needed (non-tech people and managers join them too). Cloud & DevOps programs need coding knowledge and IT experience. The SDE Master, GenAI for Software Developers and the Forward Deployed AI Engineer program are for IT professionals and developers (they teach the AI-era version of the software stack, not coding basics). Never tell someone they must already code for an AI or data science program.
- ${nameOf('AIL')} needs 2+ years of work experience including any people, project or business responsibility. MBAs who joined straight into manager roles and people fast-tracked into management qualify. There is NO higher minimum: never say a leadership or manager program needs 8+, 10+ or any other number of years beyond 2.
- Not a graduate (12th or diploma): only ${nameOf('AAP')} (a Senior Counsellor confirms the IIT Patna certificate for non-graduates; never promise it). Students still studying: ${nameOf('AAP')} now, then ${nameOf('DABA')} or ${nameOf('DSG-C')} after graduating.
- ${nameOf('MCS')} is the only degree: it needs a bachelor's degree with 60%+ aggregate, for people who need a formal master's (promotion, HR policy, immigration).
- Cloud & DevOps programs need IT experience and coding knowledge: be upfront with non-IT people and non-coders and point them to analytics or the GenAI & Agentic AI Master (coding taught from scratch) instead.
ROUTING (the Lead–Course Map, in order):
${CATALOGUE.routing.map((r, i) => `${i + 1}. ${r.question} ${r.rule}`).join('\n')}
Program codes used above: ${PROGRAMS.map((p) => `${p.code} = ${p.name}`).join('; ')}.`
}

/** Lead types: how to spot each, what to recommend, what to ask, what never to recommend. */
export function personaGuide(): string {
  return CATALOGUE.personas.map((p) => `- ${p.name} (${p.signals}): recommend ${nameOf(p.primary)}${p.upsell ? `; next step later ${nameOf(p.upsell)}` : ''}${p.alternative ? `; alternative ${nameOf(p.alternative)}` : ''}. Why: ${p.why}${p.avoid.length ? ` Never recommend: ${p.avoid.map(nameOf).join(', ')}.` : ''}${p.note ? ` Note: ${p.note}` : ''}`).join('\n')
}

/** Old program names learners may still use, and where they went. */
export function retiredNames(): string {
  const codeName = (s: string) => s.replace(/\b(AAP|DABA|DSG-C|DSG-M|GAI-SD|SDE-M|FDE-M|GAI-M|GAI-CD|CD-M|CD|AIL|MCS)\b/g, (c) => nameOf(c))
  return CATALOGUE.retired.map((r) => `- "${r.old}" is now: ${codeName(r.now)}`).join('\n')
}

/**
 * This learner: their lead type and their three programs, calculated from the Lead–Course Map (lib/lead-match), the
 * entry rules that apply, what to ask and what never to recommend. The counsellor explains this; it never re-decides it.
 */
export function learnerRoute(a: Answers): string {
  const path = pathFor(a)
  const persona = personaById(path.persona.id)
  const program = programForLearner(a) ?? getProgram(path.options[0].programId)
  const e = eligibility(program.id, a)
  const track = program.code === 'CD' || program.code === 'CD-M' ? ` Their Cloud & DevOps role track: ${cloudTrackFor(a.role).track}.` : ''
  const label = { recommend: 'Recommended', next: 'Next best', more: 'One more option' } as const
  const options = path.options.map((o) => `${label[o.kind]}: ${o.name} (${o.fit}/10)${o.later ? ` — not open yet: ${o.later}` : ''}${o.confirm ? ` — confirm: ${o.confirm}` : ''}`)
  // Programs close to what they want that the entry rules don't open to them yet, with the reason, so they are never pitched.
  const near = new Set([...path.options.map((o) => o.code), ...PROGRAMS.filter((p) => a.interest && p.interests.includes(a.interest)).map((p) => p.code)])
  const closed = PROGRAMS.filter((p) => p.code !== program.code && near.has(p.code) && !path.options.some((o) => o.code === p.code)).map((p) => ({ p, e: eligibility(p.id, a) })).filter((x) => !x.e.ok)
  const unanswered = persona ? persona.probes : []
  // The map question that decides between their programs: already answered (never ask again), or still open.
  const mq = MAP_QUESTIONS[path.persona.id]
  const mqAnswer = mq ? mq.options.find((o) => o.id === a.mapAnswers?.[mq.id]) : undefined
  const mapLine = !mq ? '' : mqAnswer
    ? `
- Map question already answered: "${mq.question}" → "${mqAnswer.label}". Never ask it again, in any words; use the answer.`
    : `
- Their open map question (the answer can change their program): "${mq.question}" (${mq.options.map((o) => o.label).join(' / ')}). Ask it in your own words when it fits the conversation, once; when they answer, even in their own words, set profileUpdate.mapAnswer.`
  return `THIS LEARNER'S PATH (calculated from their profile with Learnbay's Lead–Course Map and entry rules; binding, never re-decide it):
- Lead type: "${path.persona.name}" (${path.match}% match: ${path.persona.reasons.join('; ') || 'from their profile'}).
- ${options.join('\n- ')}
- The program you recommend is ${program.name}. Why: ${path.why}${track}${e.confirm ? ` Not yet confirmed by their profile: ${program.name} ${e.confirm}. When eligibility comes up, state that rule and ask or say it gets confirmed (eligibility test or Senior Counsellor); never say they "definitely" qualify.` : ''}
- When they ask which program fits, what they'll learn, what they'll build, how long it is or whether they're eligible, answer about ${program.name}: its syllabus, projects and entry rule are the ones below. Never present another program as their fit, and never describe one program's syllabus or projects under another's name. Mention the Next best or One more option only as that (with its reason), and a "not open yet" one only with when it opens.${closed.length ? `
- They cannot join these yet (never recommend them; if asked, explain kindly): ${closed.map((x) => `${x.p.name}: ${x.e.reason}`).join('; ')}.` : ''}
- Their target role is where they are heading; it does not change the program you recommend now.${mapLine}${(() => {
    const picked = trackOf(a.interest)
    if (!picked || program.interests.some((i) => trackOf(i)?.interest === picked.interest)) return ''
    return `\n- They picked the ${picked.label} at the start, but the map puts them on ${program.name}. If they ask about ${picked.label.replace(/ track$/, '')} programs, explain kindly and honestly why (their role, coding and experience against its entry rule), what would open it later, and why ${program.name} serves their goal now.`
  })()}
- If their own words in this chat clearly change who they are (e.g. "I do code", "I graduated last year", "I want to lead my team"), set profileUpdate and say you'll update their plan; the path is recalculated automatically.${persona ? `
Questions the map gives for this kind of learner (ask only what their profile doesn't already answer, one at a time): ${unanswered.join(' | ')}
Pains people like them usually have: ${persona.pains.join('; ')}.${persona.avoid.length ? `
Never recommend to them: ${persona.avoid.map(nameOf).join(', ')}.` : ''}${path.note ? `
Counsellor note from the map: ${path.note}` : ''}` : ''}`
}

/** A program's syllabus (module by module, with topics and projects), specialisations and capstone projects. */
export function syllabusOf(programId: string, maxProjects = 6, projectLines: string[] = []): string {
  const d = PROGRAM_DETAILS[getProgram(programId).id]
  if (!d) return ''
  const modules = d.moduleDetails.map((m) => `  ${m.weeks ? `Weeks ${m.weeks}: ` : ''}${m.name}: ${m.topics.join('; ')}${m.projects.length ? `. Projects: ${m.projects.join('; ')}` : ''}`).join('\n')
  const specs = d.electives.length ? `\nSpecialisations / tracks: ${catalogueProgram(getProgram(programId).code)!.specialisations.map((s) => `${s.name} (${s.content})`).join('; ')}.` : ''
  const projects = projectLines.length ? projectLines : d.projects.slice(0, maxProjects).map((p) => `${p.title} (${p.domain}): goal: ${p.objective} Result: ${p.outcome} Tools: ${p.tools}`)
  return `${d.name}${d.durationMonths ? `, ${d.durationMonths} months (${d.totalWeeks} weeks)` : ''}. Entry: ${d.prerequisites}
Syllabus, in order:
${modules}${specs}
Capstone and industry projects (goal, result, tools):
${projects.map((p) => `  - ${p}`).join('\n')}
Certificates: ${d.certifications.join('; ')}. Roles it leads to: ${d.roles.join(', ')}.`
}
