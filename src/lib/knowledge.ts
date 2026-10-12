// Learnbay's knowledge base for the AI counsellors (retrieval-augmented answers). Everything the counsellor may state
// about Learnbay comes from here: the 2026 catalogue (programs, modules, specialisations, projects, lead types,
// retired names), the published policies (refunds, calls, fees, eligibility test) and Learnbay's published strengths.
//
// - Chunks: one passage per program overview, module, specialisation, project, lead type, policy and strength.
// - Retrieval: BM25 over the passages with Learnbay's own synonyms (FDE, SDE, GenAI, DevOps…), boosted for the program
//   the question is about. Deterministic: the same question always retrieves the same passages.
// - Facts: for the questions learners ask most (duration, fees, eligibility, certificates, syllabus, projects, fit,
//   placement support, refunds) the exact answer is computed from the data, so the AI words it but never invents it.

import { CATALOGUE, CODE_TO_ID, ID_TO_CODE, catalogueProgram, jobReadyLabel, projectById } from '@/config/catalogue'
import { CURRICULUM_EDGE } from '@/config/curriculum'
import { REFUND_POLICY } from '@/config/policies'
import { PROGRAMS, getProgram } from '@/config/programs'
import { COMPARISON, USPS } from '@/config/usps'
import { eligibility, pathFor } from './lead-match'
import type { Answers } from './questions'

export type Chunk = { id: string; kind: 'program' | 'module' | 'specialisation' | 'project' | 'persona' | 'policy' | 'strength' | 'retired'; title: string; text: string; programs: string[] }

const nameOfCode = (code: string) => catalogueProgram(code)?.name ?? code

// ---------- Passages ----------

function buildChunks(): Chunk[] {
  const out: Chunk[] = []
  for (const p of CATALOGUE.programs) {
    const id = CODE_TO_ID[p.code]
    const prog = getProgram(id)
    const coding = prog.coding === 'no' ? 'No coding.' : prog.coding === 'some' ? 'Coding is taught from scratch; no prior coding needed.' : 'For people who already write code.'
    out.push({
      id: `program:${p.code}`, kind: 'program', programs: [id], title: p.name,
      text: `${p.name} (${p.family}). ${p.durationMonths ? `Learners are usually job-ready in about ${jobReadyLabel(p.code)}. The full syllabus runs ${p.durationMonths} months (${p.totalWeeks} weeks).` : 'A degree program; duration confirmed by a Senior Counsellor.'} ${coding} Who it is for: ${p.whoFor.join('; ')}. Not for: ${p.notFor.join('; ')}. Entry: ${p.entry} Roles it leads to: ${p.targetRoles.join(', ')}. Certificates: ${p.certificates}.${p.specialisations.length ? ` Specialisations / tracks: ${p.specialisations.map((s) => s.name).join(', ')}.` : ''}`,
    })
    for (const m of p.modules) {
      out.push({
        id: `module:${p.code}:${m.name}`, kind: 'module', programs: [id], title: `${p.name} · ${m.name}`,
        text: `In the ${p.name}${/\d/.test(m.weeks) ? `, weeks ${m.weeks}` : ''}: ${m.name}. Topics: ${m.topics.join('; ') || 'see the program'}.${m.projects.length ? ` Projects: ${m.projects.join('; ')}.` : ''}`,
      })
    }
    for (const s of p.specialisations) {
      out.push({ id: `spec:${p.code}:${s.name}`, kind: 'specialisation', programs: [id], title: `${p.name} · ${s.name}`, text: `${p.name} specialisation "${s.name}": ${s.content}.${s.projects.length ? ` Projects: ${s.projects.join('; ')}.` : ''}` })
    }
  }
  for (const x of CATALOGUE.projects) {
    const ids = x.programs.map((c) => CODE_TO_ID[c]).filter(Boolean)
    out.push({
      id: `project:${x.id}`, kind: 'project', programs: ids, title: `${x.title} (${x.domain})`,
      text: `Project "${x.title}" (${x.domain}, ${x.track}), in ${x.programs.map(nameOfCode).join('; ')}. Goal: ${x.objective} Tools: ${x.tools.join(', ')}. What you achieve: ${x.outcome}`,
    })
  }
  for (const p of CATALOGUE.personas) {
    const list = [p.primary, p.upsell, p.alternative].filter((c): c is string => Boolean(c))
    out.push({
      id: `persona:${p.id}`, kind: 'persona', programs: list.map((c) => CODE_TO_ID[c]), title: p.name,
      text: `Learners like this: ${p.name} (${p.signals}). Recommended: ${nameOfCode(p.primary)}${p.upsell ? `; next best: ${nameOfCode(p.upsell)}` : ''}${p.alternative ? `; one more option: ${nameOfCode(p.alternative)}` : ''}. Why: ${p.why} Usual worries: ${p.pains.join('; ')}.`,
    })
  }
  for (const r of CATALOGUE.retired) out.push({ id: `retired:${r.old}`, kind: 'retired', programs: [], title: r.old, text: `"${r.old}" is no longer offered as it was; it is now: ${r.now.replace(/\b(AAP|DABA|DSG-C|DSG-M|GAI-SD|SDE-M|FDE-M|GAI-M|GAI-CD|CD-M|CD|AIL|MCS)\b/g, (c) => nameOfCode(c))}.` })
  const policy = (id: string, title: string, text: string) => out.push({ id: `policy:${id}`, kind: 'policy', programs: [], title, text })
  policy('refund', 'Refund and cancellation policy', `${REFUND_POLICY.points.map((x) => `${x.title}: ${x.detail}`).join(' ')} ${REFUND_POLICY.voids}`)
  policy('fees', 'Fees, EMI, discounts and scholarships', 'Program fees, EMI options, batch dates and seats are confirmed by a Learnbay Senior Career Counsellor on a free call. On that call they check which discounts or scholarships the learner’s profile qualifies for and apply them. The AI counsellor never quotes fees or promises a discount.')
  policy('placement', 'Placement and career support', `${USPS.placement.title}: ${USPS.placement.detail} Placement support is mock interviews, resume build-up and interview calls when the learner is ready. Learnbay never guarantees a job, a salary or a hike.`)
  policy('calls', 'Calls with a Senior Counsellor', 'Learnbay’s human Senior Career Counsellors call between 10 AM and 8 PM IST. A "call me" request is answered at the earliest available time, within 1 working day. A booked call can be for today or tomorrow and can be rescheduled from the Talk to a Senior Counsellor page.')
  policy('eligibility-test', 'Eligibility test', 'The eligibility test is 10 quick questions (no maths) that check readiness for a Learnbay program, with up to 3 attempts. It shows where the learner would start.')
  policy('byop', 'Bring your own project', 'Bring your own project (BYOP): learners can bring a project from their own work or their own idea, and Learnbay mentors guide them on it as part of the program, alongside the module projects and capstones. It works best when the project uses the tools the program teaches. Coding is taught from scratch in the AI & Data Science programs, so no coding background is needed to start.')
  policy('live', 'How classes run', `${CURRICULUM_EDGE.join(' ')} ${USPS.mentors.title}: ${USPS.mentors.detail}`)
  for (const u of Object.values(USPS)) out.push({ id: `strength:${u.id}`, kind: 'strength', programs: [], title: u.title, text: `${u.title}: ${u.detail}` })
  for (const c of COMPARISON) out.push({ id: `strength:compare:${c.area}`, kind: 'strength', programs: [], title: `Compared with typical programs: ${c.area}`, text: `${c.area}: typical programs = ${c.others}; Learnbay = ${c.learnbay}` })
  return out
}

// ---------- Retrieval (BM25 with Learnbay's synonyms) ----------

const STOP = new Set('a an the and or of to in on for with is are be i me my we you your it this that what which how do does can will would should am about at as by from into get have has want need tell more program programs course courses learnbay please long much many good best right like also just really know take make give show start still ok okay there their them any some will'.split(' '))
const SYN: [RegExp, string][] = [
  [/\bfde\b|forward[- ]deployed/g, ' fde forward deployed '],
  [/\bsde\b|product compan(y|ies)|faang|dsa\b/g, ' sde dsa product '],
  [/gen ?ai|generative ai|\bllms?\b/g, ' genai llm generative '],
  [/devops|dev ops/g, ' devops cloud '],
  [/\baws\b|azure|\bgcp\b/g, ' cloud aws azure '],
  [/machine learning|\bml\b/g, ' ml machine learning '],
  [/data science|data scientist/g, ' data science scientist '],
  [/analytics|analyst/g, ' analytics analyst '],
  [/syllabus|curriculum|modules?|topics/g, ' module topics syllabus '],
  [/capstone|projects?/g, ' project capstone '],
  [/\bbyop\b|own project|my project|bring (my|your|our) own|my (work|company) (problem|use case)/g, ' byop bring own project '],
  [/(know|learn|need|require\w*) (to )?(code|coding|programming)|coding background|can'?t code|don'?t code|non[- ]?coder/g, ' coding taught scratch entry '],
  [/certificat\w*|certified/g, ' certificates certificate '],
  [/placement|job support|interview calls?|career support/g, ' placement interview resume '],
  [/fees?|cost|price|emi|discount|scholarship|afford/g, ' fees emi scholarship discount '],
  [/refund|cancel\w*|money back/g, ' refund cancellation '],
  [/eligib\w*|qualif\w*|entry|prerequisite/g, ' entry eligibility '],
  [/manager|leader|leadership|cxo|founder/g, ' leadership managers leaders '],
  [/agents?|agentic/g, ' agent agentic '],
  [/\brag\b|retrieval/g, ' rag retrieval '],
  [/no[- ]code|non[- ]?tech/g, ' no code non tech '],
  [/master'?s degree|\bms\b|m\.?tech|woolf|degree/g, ' degree master woolf '],
]
const norm = (w: string) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
export function tokens(text: string): string[] {
  let t = ` ${text.toLowerCase()} `
  for (const [re, add] of SYN) t = t.replace(re, (m) => `${m}${add}`)
  return t.replace(/[^a-z0-9+#]+/g, ' ').split(' ').filter((w) => w.length >= 2 && !STOP.has(w)).map(norm)
}

type Index = { chunks: Chunk[]; tf: Map<string, number>[]; len: number[]; avg: number; df: Map<string, number> }
let INDEX: Index | null = null
function index(): Index {
  if (INDEX) return INDEX
  const chunks = buildChunks()
  const tf = chunks.map((c) => {
    const m = new Map<string, number>()
    // The title counts twice: a passage named after the thing asked about is the best match.
    for (const w of [...tokens(c.title), ...tokens(c.title), ...tokens(c.text)]) m.set(w, (m.get(w) ?? 0) + 1)
    return m
  })
  const len = tf.map((m) => [...m.values()].reduce((a, b) => a + b, 0))
  const df = new Map<string, number>()
  for (const m of tf) for (const w of m.keys()) df.set(w, (df.get(w) ?? 0) + 1)
  INDEX = { chunks, tf, len, avg: len.reduce((a, b) => a + b, 0) / len.length, df }
  return INDEX
}

export type Hit = Chunk & { score: number }

/**
 * The passages that best answer a question. `programs`: the program(s) the question is about (theirs first), whose
 * passages are boosted; `kinds`: passage kinds the question's intent prefers (e.g. modules for a syllabus question).
 */
export function retrieve(query: string, opts: { programs?: string[]; kinds?: Chunk['kind'][]; k?: number } = {}): Hit[] {
  const ix = index()
  const q = [...new Set(tokens(query))]
  if (!q.length) return []
  const N = ix.chunks.length
  const k1 = 1.2, b = 0.75
  const focus = opts.programs ?? []
  const hits: Hit[] = []
  ix.chunks.forEach((c, i) => {
    let s = 0
    for (const w of q) {
      const f = ix.tf[i].get(w)
      if (!f) continue
      const n = ix.df.get(w) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * ix.len[i]) / ix.avg)))
    }
    if (!s) return
    const rank = focus.findIndex((p) => c.programs.includes(p))
    if (rank === 0) s *= 1.8
    else if (rank > 0) s *= 1.25
    else if (focus.length && c.programs.length && (c.kind === 'module' || c.kind === 'specialisation')) s *= 0.5
    if (opts.kinds?.includes(c.kind)) s *= 1.5
    hits.push({ ...c, score: Math.round(s * 100) / 100 })
  })
  hits.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
  // Only passages that genuinely match: weak hits (a stray shared word) are noise the model might repeat.
  const top = hits[0]?.score ?? 0
  return hits.filter((h) => h.score >= Math.max(3, top * 0.35)).slice(0, opts.k ?? 6)
}

// ---------- Intents and exact facts ----------

export type Intent = 'duration' | 'fees' | 'eligibility' | 'certificates' | 'syllabus' | 'projects' | 'fit' | 'placement' | 'refund' | 'general'

const INTENTS: [Intent, RegExp][] = [
  ['refund', /\b(refund|cancel|money back|trial period)\b/i],
  ['fees', /\b(fees?|cost|price|pricing|how much|emi|discount|scholarship|afford|expensive|loan|pay for)\b/i],
  ['duration', /\b(how long|duration|how many (months|weeks)|length of|months? long|weeks? long|time (does it|will it) take to (finish|complete))\b/i],
  ['eligibility', /\b(eligib|qualify|entry (requirement|criteria)|prerequisite|can i join|am i allowed|requirements? to join|need (a )?degree)\w*/i],
  ['certificates', /\b(certificat\w*|certified|iit patna|ibm|credential)\b/i],
  ['placement', /\b(placement|placed|job guarantee|guarantee|interview calls?|career support|hiring partners?|get (me )?a job)\b/i],
  ['syllabus', /\b(syllabus|curriculum|modules?|what will i learn|topics|what do you teach|course content|structure)\b/i],
  ['projects', /\b(projects?|capstones?|what will i build|portfolio)\b/i],
  ['fit', /\b(which (program|course|one)|right (program|course|for me)|best (program|course|for me|fit)|suit(s|able)? me|should i (join|take|choose|pick)|recommend)\b/i],
]

export function intentOf(message: string): Intent {
  return INTENTS.find(([, re]) => re.test(message))?.[0] ?? 'general'
}

const KINDS: Partial<Record<Intent, Chunk['kind'][]>> = {
  syllabus: ['module', 'specialisation'], projects: ['project', 'module', 'specialisation'], fees: ['policy'], refund: ['policy'],
  placement: ['policy', 'strength'], certificates: ['program'], eligibility: ['program'], duration: ['program'], fit: ['program', 'persona'],
}

export type Facts = {
  intent: Intent
  programId: string | null
  /** Exact statements the answer must agree with. */
  facts: string[]
  /** A complete, correct answer from the data alone, used when the AI's answer fails the guardrails. */
  fallback: { reply: string; points: { title: string; detail: string }[]; next: string; route: string | null; show: string | null } | null
}

/** The exact facts for this question about this program (their recommended one unless they named another). */
export function factsFor(message: string, a: Answers | undefined, programId: string | null): Facts {
  const intent = intentOf(message)
  const p = programId ? catalogueProgram(programId) : undefined
  const prog = programId ? getProgram(programId) : undefined
  const none: Facts = { intent, programId, facts: [], fallback: null }
  if (intent === 'fees') {
    return {
      intent, programId,
      facts: ['Never state any fee amount, discount amount or EMI figure.', 'A Senior Counsellor confirms the fee, EMI options, batch and seats on a free call, and checks which discounts or scholarships the learner’s profile qualifies for.'],
      fallback: { reply: 'Fair question, and it’s worth knowing your real number before you decide. On a free call, a Senior Counsellor walks you through the fee and EMI options and checks which discounts or scholarships your profile qualifies for.', points: [], next: 'Book a free call with a Senior Counsellor', route: '/dashboard/sessions', show: null },
    }
  }
  if (intent === 'refund') {
    return {
      intent, programId, facts: REFUND_POLICY.points.map((x) => `${x.title}: ${x.detail}`),
      fallback: { reply: 'Here’s how Learnbay’s refund policy works, so you can try it without worry.', points: REFUND_POLICY.points.slice(0, 2).map((x) => ({ title: x.title, detail: x.detail })), next: '', route: null, show: 'refund' },
    }
  }
  if (intent === 'placement') {
    return {
      intent, programId,
      facts: ['Placement support = mock interviews, resume build-up and interview calls when the learner is ready.', 'Never promise or guarantee a job, a salary, a hike or interview calls from named companies.'],
      fallback: { reply: 'When you’re ready, Learnbay’s placement team supports you with mock interviews, resume build-up and interview calls. Nobody can honestly guarantee a job, but they make sure you walk in prepared.', points: [], next: '', route: null, show: 'proof' },
    }
  }
  if (!p || !prog) return none
  if (intent === 'duration') {
    // Job-ready is the headline; the course length follows as its own, quieter sentence (never paired with it).
    const line = p.durationMonths ? `Most learners in the ${p.name} are job-ready in about ${jobReadyLabel(p.code)}. The full syllabus runs ${p.durationMonths} months (${p.totalWeeks} weeks).` : `The ${p.name}'s duration is confirmed by a Senior Counsellor.`
    return { intent, programId, facts: [line, 'Batch dates and weekly class timings are confirmed by a Senior Counsellor.'], fallback: { reply: `${line} Your batch dates and weekly class timings are confirmed with a Senior Counsellor on a free call.`, points: [], next: '', route: null, show: null } }
  }
  if (intent === 'certificates') {
    const line = `The ${p.name} gives: ${p.certificates}.`
    const nonGrad = p.code === 'AAP' && a && (a.eduLevel === 'diploma' || a.studyStage === 'final-year')
    return { intent, programId, facts: [line, ...(nonGrad ? ['For non-graduates, the IIT Patna certificate is confirmed by a Senior Counsellor; never promise it.'] : []), 'Never name a certificate the program does not list (no Microsoft, AWS or Google certification).'], fallback: { reply: `${line}${nonGrad ? ' As you haven’t graduated yet, a Senior Counsellor confirms the IIT Patna certificate for you.' : ''}`, points: [], next: '', route: null, show: 'proof' } }
  }
  if (intent === 'eligibility' && a) {
    const e = eligibility(prog.id, a)
    const status = !e.ok ? `They cannot join it yet: ${e.reason}.` : e.confirm ? `They can join, but this must be confirmed: ${prog.name} ${e.confirm}.` : 'From their profile they meet the entry rule; the eligibility test shows where they would start.'
    const plain = !e.ok ? `From what you’ve shared, it isn’t open to you yet: ${e.reason?.replace(/^.*? needs/, 'it needs')}.` : e.confirm ? 'That part gets confirmed on your eligibility test or your call with a Senior Counsellor.' : 'From what you’ve shared, you meet it. The eligibility test shows where you’d start.'
    return { intent, programId, facts: [`Entry rule for the ${p.name}: ${p.entry}`, status], fallback: { reply: `For the ${p.name}, the entry rule is: ${p.entry} ${plain}`, points: [], next: e.ok ? 'Take the eligibility test' : '', route: e.ok ? '/dashboard/eligibility' : null, show: 'program' } }
  }
  if (intent === 'syllabus') {
    const mods = p.modules.filter((m) => !/induction/i.test(m.name))
    return {
      intent, programId, facts: [`The ${p.name} modules, in order: ${p.modules.map((m) => `${m.name}${/\d/.test(m.weeks) ? ` (weeks ${m.weeks})` : ''}`).join('; ')}.`],
      fallback: { reply: `Here’s how the ${p.name} is laid out${p.durationMonths ? ` over ${p.durationMonths} months` : ''}. The card below lists every module with its topics and projects.`, points: mods.slice(0, 3).map((m) => ({ title: m.name.split(/[:(]/)[0].slice(0, 40), detail: m.topics.slice(0, 2).join('; ') })), next: '', route: null, show: 'curriculum' },
    }
  }
  if (intent === 'projects') {
    const caps = p.capstones.map((id) => projectById(id)).filter((x): x is NonNullable<typeof x> => Boolean(x))
    return {
      intent, programId, facts: [`Projects in the ${p.name} come from its modules and its capstone list (e.g. ${caps.slice(0, 4).map((x) => `${x.title} (${x.domain})`).join('; ')}). Name only these or the module projects.`],
      fallback: { reply: `In the ${p.name} you build hands-on module projects and a capstone from a real industry scenario.`, points: caps.slice(0, 2).map((x) => ({ title: x.title, detail: x.outcome })), next: '', route: null, show: 'projects' },
    }
  }
  if (intent === 'fit' && a) {
    const path = pathFor(a)
    const kind = { recommend: 'Recommended', next: 'Next best', more: 'One more option' } as const
    // The answer is always their own recommended program (what their path shows), even when they named another one.
    const best = path.options[0]
    const shown = path.options.slice(0, path.show)
    const asked = shown.some((o) => o.programId === programId) ? null : prog
    return {
      intent, programId: best.programId,
      facts: [
        `Their lead type: ${path.persona.name} (${path.match}% match).`,
        ...shown.map((o) => `${kind[o.kind]}: ${o.name} (${o.fit}/10)${o.later ? `, not open yet (${o.later})` : ''}.`),
        ...(asked ? [`They asked about the ${asked.name}: it is not the best fit for their profile. Say so kindly and briefly, then explain why the ${best.name} fits them better.`] : []),
        `Recommend the ${best.name}${path.show > 1 ? ' (and the second program above as the other option)' : ''}; never list other programs or present another program as their fit.`,
      ],
      fallback: {
        reply: `${asked ? `The ${asked.name} isn’t the best fit for your profile. ` : ''}From everything you’ve told me, the ${best.name} fits you best. ${path.why}`,
        points: path.options.slice(1, path.show).filter((o) => !o.later).map((o) => ({ title: kind[o.kind], detail: `${o.name}: ${o.why}` })), next: 'Take the eligibility test', route: '/dashboard/eligibility', show: 'program',
      },
    }
  }
  return none
}

/** The knowledge the counsellor gets for one question: the exact facts and the best passages, ready for the prompt. */
export function groundingFor(message: string, a: Answers | undefined, programId: string | null, related: string[] = []): { facts: Facts; hits: Hit[]; block: string } {
  const facts = factsFor(message, a, programId)
  const found = retrieve(message, { programs: [programId, ...related].filter((x): x is string => Boolean(x)), kinds: KINDS[facts.intent], k: 6 })
  // The program the question is about is always in view (short follow-ups like "how long is it?" name nothing).
  const own = programId ? index().chunks.find((c) => c.id === `program:${ID_TO_CODE[programId]}`) : undefined
  const hits: Hit[] = own && !found.some((h) => h.id === own.id) ? [{ ...own, score: 0 }, ...found.slice(0, 5)] : found
  const block = `${facts.facts.length ? `\n\nEXACT FACTS FOR THIS QUESTION (from Learnbay's catalogue and policies; use them as given, never contradict or add to them):\n${facts.facts.map((f) => `- ${f}`).join('\n')}` : ''}${hits.length ? `\n\nFROM LEARNBAY'S KNOWLEDGE BASE (the passages that match this question; answer from these and the facts above. If they don't cover what was asked, say so honestly and offer a Senior Counsellor; never fill the gap with general knowledge about Learnbay):\n${hits.map((h, i) => `[K${i + 1}] ${h.title}: ${h.text}`).join('\n')}` : ''}`
  return { facts, hits, block }
}

export { ID_TO_CODE, PROGRAMS }
