// Which lead type a learner is (the Lead–Course Map) and which programs fit them, calculated, not guessed:
// 1. Every lead type is scored against what the learner told us (experience, coding, role, industry, goal, interest,
//    their answer to the lead type's probe question). The highest score is their lead type.
// 2. Its programs, in the map's order: Recommend, Next best (the map's upsell) and One more option (its alternative),
//    minus its "don't recommend" list. The map's notes and the probe answer can reorder them (e.g. a QA engineer who
//    wants AI testing gets the GenAI & Agentic AI Master first). A tech professional who asks about FDE gets the
//    Forward Deployed AI Engineer Master first (routing rule 1).
// 3. Learnbay's entry rules decide last: a program they can't join yet moves to "later", with the reason.
// Same answers, same result, every time.

import { CATALOGUE, CODE_TO_ID, personaById } from '@/config/catalogue'
import { MAP_QUESTIONS } from '@/config/map-questions'
import { PROGRAMS, getProgram } from '@/config/programs'
import { NONTECH_ROLES, type Answers } from './questions'

// ---------- Facts about the learner ----------

/** Years of work experience at the bottom of their band ("1–2 years" counts as 1). Undefined if not asked yet. */
export function yearsOf(a: Answers): number | undefined {
  const map: Record<string, number> = { '0': 0, '1-2': 1, '3-5': 3, '6-9': 6, '10-15': 10, '15+': 15 }
  if (a.experience && a.experience in map) return map[a.experience]
  if (a.role === 'student' || a.domain === 'student') return 0
  return undefined
}

/** Whether they code, when the role already says it. */
export function inferredProgrammer(a: Answers): string | undefined {
  if (a.role === 'software-engineer' || a.role === 'devops-cloud') return 'yes'
  return undefined
}

/** Writes code: they said so, or their role says so. */
export function codes(a: Answers): boolean {
  if (a.programmer) return a.programmer !== 'no'
  return Boolean(inferredProgrammer(a))
}

const MANAGER_ROLES = new Set(['project-manager', 'product-manager'])
const CREATIVE_ROLES = new Set(['marketing', 'designer', 'content'])
const INFRA_ROLES = new Set(['network-admin', 'sysadmin', 'it-support', 'dba'])
const DOMAIN_INDUSTRIES = new Set(['bfsi', 'healthcare', 'manufacturing', 'retail', 'telecom'])
const LEADING = new Set(['leading', 'asked-to-lead', 'lead-ai'])

// A role they typed themselves ("BSS-OSS Engineer", "NOC engineer", "Risk analyst") read for what it is.
const NOT_IT = /\b(civil|mechanical|electrical|chemical|site|production|sales|field|service advisor|marketing)\b/i
const RE = {
  dev: /\b(developer|programmer|software|full ?stack|backend|back-end|frontend|front-end|sde|web dev|mobile dev|android|ios dev)\b/i,
  qa: /\b(qa|tester|testing|test engineer|automation test|sdet)\b/i,
  cloud: /\b(devops|sre|site reliability|cloud|platform engineer|kubernetes)\b/i,
  infra: /\b(network|noc|bss|oss|telecom engineer|rf engineer|rf optimi[sz]ation|ran engineer|transmission engineer|system admin|sysadmin|system engineer|systems engineer|server|it support|it ops|itops|helpdesk|help desk|desktop support|technical support|tech support|infrastructure|infra|dba|database admin|linux|windows admin|storage|data ?cent(er|re)|security analyst|soc analyst|it engineer|it executive|it admin)\b/i,
  data: /\b(data analyst|data scientist|data engineer|ml engineer|machine learning|bi analyst|bi developer|business intelligence|mis|reporting analyst|analytics)\b/i,
  manager: /\b(manager|lead|head|director|architect|vp|vice president|cxo|cto|ceo|coo|founder|co-founder|owner|partner)\b/i,
  creative: /\b(design|designer|market|marketing|content|video|editor|social media|copywrit|brand|creative|animator)\b/i,
  founder: /\b(founder|co-founder|owner|ceo|cxo|director|business head|entrepreneur)\b/i,
  // Engineers outside IT (shop floor, plant, hardware): technical people in their industry, not "non-tech".
  engineer: /\b(robot(?!ic process)\w*|(?<!(test|marketing|email|sales|business process|robotic process) )automation|plc|scada|dcs|cnc|hmi|mechatronics?|embedded|firmware|instrumentation|offline program\w*|olp|process simulat\w*|simulation engineer|virtual commissioning|cad|cae|cfd|fea|r ?& ?d|design engineer|process engineer|production engineer|manufacturing engineer|quality engineer|maintenance engineer|reliability engineer|industrial engineer|mechanical engineer|electrical engineer|electronics engineer|chemical engineer|civil engineer|structural engineer|vlsi|semiconductor|iot|scientist|researcher|research associate|phd|(marine|aerospace|aeronautical|automobile|petroleum|mining|metallurg\w*|textile|biomedical|environmental|agricultural|instrumentation|production|process|plant|piping|hvac|safety|project) engineer)\b/i,
}
/** "Programmer" in an industrial role (robot, PLC, CNC, offline programming) is not a software developer. */
const INDUSTRIAL_CODE = /\b(robot(?!ic process)\w*|plc|cnc|scada|ladder|offline program\w*|olp|nc program\w*)\b/i

export type Facts = {
  years?: number; coder: boolean; codesDaily: boolean; role: string; text: string
  dev: boolean; qa: boolean; cloudRole: boolean; infra: boolean; dataRole: boolean; manager: boolean; creative: boolean
  founder: boolean; nonTechRole: boolean; it: boolean; domainIndustry: boolean; leading: boolean; wantsFde: boolean; wantsAie: boolean
  /** An engineer outside IT (robotics, automation, process, design...): technical, building AI in their industry. */
  engineer: boolean
}

export function factsOf(a: Answers): Facts {
  const role = a.role ?? ''
  const text = role === 'other' ? (a.roleOther ?? '').toLowerCase() : ''
  const typed = (re: RegExp) => Boolean(text) && re.test(text)
  // Their own "I don't write code" outranks a developer title (a support or analyst job with that title).
  const dev = (role === 'software-engineer' || (typed(RE.dev) && !typed(INDUSTRIAL_CODE))) && a.programmer !== 'no'
  const qa = role === 'qa-engineer' || typed(RE.qa)
  const cloudRole = role === 'devops-cloud' || typed(RE.cloud)
  // A typed role that manages ("Network Operations Manager") is a manager first: the map sends managers to leadership.
  const infra = INFRA_ROLES.has(role) || (typed(RE.infra) && !typed(NOT_IT) && !typed(RE.manager))
  const dataRole = role === 'data-analyst' || role === 'data-excel' || typed(RE.data)
  const manager = MANAGER_ROLES.has(role) || (typed(RE.manager) && !dev && !qa)
  // "Design engineer", "process design engineer": an engineer, not a creative.
  const engineerText = typed(RE.engineer) && !typed(/\bmarketing\b/i)
  const creative = CREATIVE_ROLES.has(role) || (typed(RE.creative) && !(engineerText && /\bengineer/.test(text)))
  const founder = typed(RE.founder) || (role === 'consultant' && (yearsOf(a) ?? 0) >= 10)
  // IT experience is what Cloud & DevOps needs (not coding): any developer, QA, cloud, infra or data role.
  const it = dev || qa || cloudRole || infra || role === 'data-analyst' || typed(RE.data) || (role === 'other' && a.domain === 'it-services' && !typed(NOT_IT) && !creative)
  const engineer = engineerText && !dev && !qa && !cloudRole && !infra && !creative && !typed(RE.manager)
  // A role they typed that isn't IT counts as non-tech, unless they write code or are an engineer in their field.
  const nonTechRole = NONTECH_ROLES.includes(role) || role === 'business-non-tech' || (role === 'other' && !it && !engineer && a.programmer !== 'yes' && !inferredProgrammer(a))
  return {
    years: yearsOf(a), coder: codes(a), codesDaily: a.programmer === 'yes' || inferredProgrammer(a) === 'yes', role, text,
    dev, qa, cloudRole, infra, dataRole, manager, creative, founder, nonTechRole, it, engineer,
    domainIndustry: DOMAIN_INDUSTRIES.has(a.domain ?? ''), leading: manager || LEADING.has(a.probe ?? ''),
    wantsFde: a.interest === 'fde' || a.targetRole === 'fde' || a.targetRole === 'solutions-engineer',
    wantsAie: a.targetRole === 'ai-engineer',
  }
}

/** Their answer to a lead type's probe question (lib/config map-questions), if they gave one. */
const mapAnswer = (a: Answers, persona: string) => {
  const q = MAP_QUESTIONS[persona]
  return q ? a.mapAnswers?.[q.id] : undefined
}

// ---------- 1. Lead type ----------

export type PersonaScore = { id: string; name: string; score: number; reasons: string[] }

/** Every lead type scored against the learner, best first. Signals the map gives for each lead type earn points. */
export function scorePersonas(a: Answers): PersonaScore[] {
  const f = factsOf(a)
  const y = f.years
  const fresher = y === 0
  const working = y === undefined || y >= 1
  const student = a.studyStage === 'final-year'
  const diploma = a.eduLevel === 'diploma'
  const out: Record<string, { score: number; reasons: string[] }> = {}
  const add = (id: string, points: number, reason: string) => {
    const s = (out[id] ??= { score: 0, reasons: [] })
    s.score += points
    if (points > 0 && reason) s.reasons.push(reason)
  }
  const ans = (persona: string) => mapAnswer(a, persona)

  // Students and freshers
  if (diploma) add('non-grad', 100, '12th or diploma, no degree yet')
  if (student) add('student', 95, 'Still studying')
  if (fresher && !student) {
    if (f.coder) add('fresher-tech', 60, 'Fresher who codes')
    else add('fresher-nontech', 60, 'Fresher who doesn’t code')
    if (f.coder && (a.interest === 'ai' || a.interest === 'data-science')) add('fresher-tech', 10, 'Wants data or AI')
    if (!f.coder && a.interest === 'analytics') add('fresher-nontech', 10, 'Wants an analyst job')
  }
  if (working && a.trigger === 'career-break') add('career-gap', 90, 'Returning after a career break')

  if (working) {
    // Non-tech professionals
    if (f.creative && !f.it) add('creative', 70, 'Marketing, design or content role')
    if (f.nonTechRole && !f.creative && !f.manager) {
      add('nontech-upskill', 50, 'Non-tech professional')
      add('nontech-switch', 45, 'Non-tech professional')
      if (a.goal === 'upskill' || a.goal === 'explore') add('nontech-upskill', 15, 'Wants to grow in their current role')
      if (a.goal === 'switch' || a.goal === 'salary' || a.goal === 'start') add('nontech-switch', 20, 'Wants to switch roles')
      if (a.interest === 'analytics' || a.interest === 'data-science') add('nontech-switch', 25, 'Wants an analyst job')
      if (ans('nontech-upskill') === 'switch') add('nontech-switch', 40, 'Wants to switch to an analyst role')
      if (ans('nontech-upskill') === 'grow') add('nontech-upskill', 30, 'Wants to grow in their current role')
    }
    if (a.role === 'data-excel') add('nontech-switch', 15, 'Builds reports today')
    // Data
    if (f.dataRole) {
      add('analyst', 60, 'Works with data today')
      if (f.codesDaily && a.role !== 'data-excel') add('data-pro', 55, 'Writes code daily in a data role')
      if (f.codesDaily && (a.interest === 'ai' || a.interest === 'fde')) add('data-pro', 20, 'Wants GenAI and agent skills')
      if (a.interest === 'data-science') add('analyst', 10, 'Wants data science')
    }
    // Developers and QA
    if (f.dev) {
      if (y !== undefined && y >= 6) add('dev-senior', 70, `${a.experience} years as a developer`)
      else add('dev-junior', 65, 'Developer moving into AI')
      if (a.targetRole === 'sde-product' || ans('dev-junior') === 'product') add('dev-product', 90, 'Aiming for a product company')
      if (a.difficulty === 'interviews') add('dev-product', 15, 'Interviews are the hard part')
      if (a.interest === 'cloud-devops') add('infra-ops', 75, 'Developer moving into cloud and DevOps')
    }
    if (f.qa) add('qa', 75, 'QA or test engineer')
    // Cloud and infrastructure
    if (f.cloudRole) add('cloud-pro', 85, 'Already works in cloud or DevOps')
    if (f.infra) add('infra-ops', 75, 'IT infrastructure role')
    if (a.interest === 'cloud-devops' && f.it && !f.cloudRole) add('infra-ops', 10, 'Wants cloud and DevOps')
    if (a.interest === 'cloud-devops' && !f.it && !f.manager) add('nontech-cloud', 80, 'Wants cloud without an IT background')
    // Managers and leaders
    if (f.manager) {
      // Managing is the strongest signal the map gives: it outranks the track they picked and their function.
      add('tech-manager', 80, 'Manages people, projects or delivery')
      if (f.it || a.domain === 'it-services' || a.domain === 'product' || a.domain === 'telecom') add('tech-manager', 15, 'In a tech organisation')
    }
    if (LEADING.has(a.probe ?? '')) {
      if (f.coder || f.it) add('tech-manager', 25, 'Leads or is asked to lead AI work')
      else add('biz-leader', 25, 'Leads or is asked to lead AI work')
    }
    if (f.founder || (f.nonTechRole && (y ?? 0) >= 10 && LEADING.has(a.probe ?? ''))) add('biz-leader', 60, 'Business leader, founder or senior consultant')
    // Domain specialists and the undecided
    if (f.domainIndustry && !f.dev && !f.qa && !f.cloudRole && !f.infra && !f.dataRole && !f.manager && !f.creative) {
      add('domain-pro', f.coder || f.engineer ? 55 : 25, 'Specialist in their industry')
    }
    // Engineers outside IT (robotics, automation, process, design): build AI in their own field, coding taught from scratch.
    if (f.engineer && !f.manager) {
      add('domain-pro', f.domainIndustry ? 15 : 60, f.domainIndustry ? 'Engineer in their industry' : 'Engineer in their field')
      if (a.interest === 'ai' || a.interest === 'data-science') add('domain-pro', 10, 'Wants to build AI in their field')
    }
    if (f.coder && (f.it || f.domainIndustry)) add('undecided-tech', 30, 'Tech professional who wants AI')
    if (a.goal === 'explore') add('undecided-tech', 10, 'Exploring where AI fits')
    if (ans('undecided-tech') === 'degree' || ans('degree') === 'degree') add('degree', 120, 'Needs a formal degree')
  }

  return CATALOGUE.personas
    .map((p) => ({ id: p.id, name: p.name, score: out[p.id]?.score ?? 0, reasons: out[p.id]?.reasons ?? [] }))
    .sort((x, y) => y.score - x.score)
}

// ---------- 2 + 3. Programs ----------

export type PathKind = 'recommend' | 'next' | 'more'
export type PathOption = {
  code: string; programId: string; name: string; kind: PathKind; fit: number
  /** Why this one, in a line. */
  why: string
  /** Not open to them yet: the entry rule and when it opens (e.g. "after graduating"). */
  later?: string
  /** Open, but one thing must be confirmed (e.g. 2+ years for the AI Leadership Program). */
  confirm?: string
}
export type LeadPath = {
  persona: PersonaScore
  /** How clearly they match their lead type (60-98). */
  match: number
  ranked: PersonaScore[]
  options: PathOption[]
  /** The map's reason for the recommendation. */
  why: string
  /** The map's note for this lead type, if any (counsellor guidance, never shown as is). */
  note: string
}

/** Whether a learner can join a program, by Learnbay's entry rules. `confirm` = eligible, but the counsellor should check. */
export function eligibility(programId: string, a: Answers): { ok: boolean; reason: string | null; confirm: string | null } {
  const p = getProgram(programId)
  const years = yearsOf(a)
  if (a.eduLevel === 'diploma' && p.code !== 'AAP') return { ok: false, reason: `${p.name} needs a graduate degree; the Applied AI Practitioner Program is open without one`, confirm: null }
  // Students still studying: the Applied AI Practitioner now, the graduate programs once they have their degree.
  if (a.studyStage === 'final-year' && p.code !== 'AAP') return { ok: false, reason: `${p.name} needs a completed degree: join it after graduating (the Applied AI Practitioner Program is open now)`, confirm: null }
  if (p.code === 'MCS') return { ok: true, reason: null, confirm: "needs a bachelor's degree with 60%+ aggregate" }
  // Not a graduate (yet): the course is open, but the IIT Patna certificate for non-graduates is Learnbay's call.
  if (p.code === 'AAP' && (a.eduLevel === 'diploma' || a.studyStage === 'final-year')) return { ok: true, reason: null, confirm: 'is open without a degree, but the IIT Patna certificate for non-graduates is confirmed by a Senior Counsellor (never promise it; IBM is not in question)' }
  if (years === 0 && p.minYears >= 1) return { ok: false, reason: `${p.name} needs ${p.minYears}+ year${p.minYears > 1 ? 's' : ''} of work experience; the programs open to freshers are Applied AI Practitioner, Data & Business Analytics with GenAI, and Data Science & GenAI Program`, confirm: null }
  if (p.code === 'AIL' && years !== undefined && years < 3) return { ok: true, reason: null, confirm: 'needs 2+ years of work experience including any people, project or business responsibility (MBAs who joined as managers qualify)' }
  if (p.coding === 'yes' && a.programmer === 'no') return { ok: false, reason: `${p.name} is built for people who write code`, confirm: null }
  // FDE needs a year in a tech role and writing code (the catalogue's entry rule): "a little" code outside tech isn't enough.
  if (p.code === 'FDE-M' && years !== undefined && !factsOf(a).it && !(factsOf(a).manager && ['it-services', 'product', 'telecom'].includes(a.domain ?? '')) && a.programmer !== 'yes') return { ok: false, reason: `${p.name} needs 1+ year in a tech role, writing code`, confirm: null }
  // Cloud & DevOps needs a year in an IT role (not coding).
  if ((p.code === 'CD' || p.code === 'CD-M') && !factsOf(a).it && years !== undefined) return { ok: false, reason: `${p.name} needs 1+ year in an IT role`, confirm: null }
  return { ok: true, reason: null, confirm: null }
}

/** The map's programs for a lead type, reordered by its notes and the learner's answers. Codes, best first. */
function orderFor(persona: string, a: Answers, f: Facts): string[] {
  const p = personaById(persona)
  if (!p) return []
  const base = [p.primary, p.upsell, p.alternative].filter((c): c is string => Boolean(c))
  const ans = mapAnswer(a, persona)
  const first = (...codes: string[]) => [...codes, ...base.filter((c) => !codes.includes(c))]
  switch (persona) {
    case 'student': return ans === 'code' ? ['AAP', 'DSG-C', 'DABA'] : base
    // Non-graduates: the Applied AI Practitioner Program only. It helps without a degree, in a job or freelancing;
    // the master's degree (the map's alternative) needs a bachelor's, so it is never shown to them.
    case 'non-grad': return ['AAP']
    case 'fresher-nontech': return ans === 'no' ? ['DABA', 'AAP', 'DSG-C'] : base
    // Tech returnees → Data Science & GenAI Program; non-tech returnees → Data & Business Analytics.
    case 'career-gap': return ans === 'tech' || (ans === undefined && f.it) ? ['DSG-C', 'DABA'] : ['DABA', 'DSG-C']
    case 'creative': return ans === 'switch' || a.goal === 'switch' ? first('DABA', 'AAP') : ans === 'lead' ? first('AAP', 'AIL') : base
    case 'analyst':
      if (ans === 'ai-apps') return first('DSG-C', 'GAI-M')
      return f.codesDaily && (f.years ?? 0) >= 3 && a.interest !== 'analytics' && ans !== 'unsure' ? first('DSG-M', 'DSG-C') : base
    case 'data-pro': return ans === 'ds-depth' || a.interest === 'data-science' ? first('DSG-M', 'FDE-M') : base
    case 'dev-junior': return a.interest === 'data-science' ? ['DSG-M', 'GAI-SD', 'GAI-M'] : base
    case 'dev-senior': return ans === 'no' ? first('GAI-M', 'FDE-M') : base
    // "If the goal is AI testing, offer the GenAI & Agentic AI Master (AI-driven testing)."
    case 'qa': return ans === 'ai' || (ans === undefined && a.interest === 'ai') ? ['GAI-M', 'CD', 'CD-M'] : base
    case 'cloud-pro': return ans === 'apps' ? first('GAI-CD', 'FDE-M') : base
    // Developers moving into cloud with 6+ years: the Master for architect-level roles.
    case 'infra-ops': return !f.infra && f.dev && (f.years ?? 0) >= 6 ? first('CD-M', 'CD') : base
    // "If they still code and want to build, offer the GenAI & Agentic AI Master."
    case 'tech-manager': return (ans === 'hands-on' || a.probe === 'hands-on') && f.coder ? first('GAI-M', 'AIL') : base
    // Coding is taught from scratch in the AI programs: engineers and people who want to build AI in their industry get
    // the GenAI & Agentic AI Master with their domain specialisation. "Apply AI in my function" → the no-code path; a
    // non-coder who hasn't said yet → the map's domain analytics track (DABA) or AAP, with the master as the third option.
    case 'domain-pro':
      if (ans === 'apply') return ['AAP', 'DABA', 'GAI-M']
      if (ans === 'build' || f.coder || f.engineer) return [...base, 'AAP']
      return ['DABA', 'AAP', 'GAI-M']
    case 'undecided-tech':
      if (ans === 'data-science') return ['DSG-M', 'GAI-M', 'GAI-SD']
      if (ans === 'sde') return ['SDE-M', 'GAI-SD', 'GAI-M']
      if (ans === 'lead') return ['AIL', 'GAI-M', 'FDE-M']
      return base
    default: return base
  }
}

/** Why the first program, when the learner's answers moved it ahead of the map's default for their lead type. */
const REORDER_WHY: Record<string, string> = {
  'GAI-M': 'Wants to build with AI: the GenAI & Agentic AI Master, with a specialisation for their background (e.g. Software Developers, Cloud & DevOps or their industry).',
  'DSG-M': 'Already codes and wants depth in data science: the full data science and AI path with domain electives.',
  'DSG-C': 'Builds on what they know and adds Python, statistics, ML and GenAI, with fresh projects.',
  DABA: 'Wants an analyst role: Excel, statistics, SQL and BI first, in their own domain.',
  'FDE-M': 'Asked about Forward Deployed Engineering and codes: the FDE Master comes first.',
  'SDE-M': 'Aiming for a product company: DSA and system design first, then GenAI.',
  'CD-M': 'Experienced engineer moving into cloud: the Master for architect-level roles.',
  AIL: 'Leads people or AI work: GenAI and agentic AI for managers, business transformation and AI project delivery (Python taught from scratch).',
  AAP: 'No-code AI with a function track for their work.',
}
const catalogueWho = (code: string) => CATALOGUE.programs.find((p) => p.code === code)?.whoFor[0] ?? ''

const FIT: Record<PathKind, number> = { recommend: 9, next: 8, more: 7 }
const KIND_WHY: Record<PathKind, string> = { recommend: 'The best fit for you today', next: 'The natural next step', more: 'One more option that suits you' }

/** The learner's lead type and their three programs from the map: Recommend, Next best, One more option. */
export function pathFor(a: Answers): LeadPath {
  const f = factsOf(a)
  const ranked = scorePersonas(a)
  // Nothing scored yet (too little known): the broadest no-code start.
  const top = ranked[0].score > 0 ? ranked[0] : { ...(ranked.find((p) => p.id === (f.coder && f.it ? 'undecided-tech' : 'nontech-upskill')) ?? ranked[0]), reasons: ['Based on what we know so far'] }
  const persona = personaById(top.id)!
  const avoid = new Set(persona.avoid)
  let order = orderFor(top.id, a, f)
  // Routing rule 1: a tech professional who asks about FDE hears about the FDE Master first (if they code at all).
  if (f.wantsFde && persona.fdePriority && f.coder && (f.years ?? 1) >= 1) order = ['FDE-M', ...order.filter((c) => c !== 'FDE-M')]
  // Routing rule 2: a developer who codes daily and aims for the AI Engineer role also hears about the AI Engineer
  // Master, right after their main recommendation (it never replaces it).
  if (f.wantsAie && f.codesDaily && (f.years ?? 1) >= 1 && !avoid.has('AIE')) order = [order[0], 'AIE', ...order.slice(1).filter((c) => c !== 'AIE')]
  order = [...new Set(order)].filter((c) => !avoid.has(c) || c === order[0])

  const now: string[] = []
  const later: { code: string; reason: string }[] = []
  for (const code of order) {
    const id = CODE_TO_ID[code]
    const e = eligibility(id, a)
    if (e.ok) now.push(code)
    else later.push({ code, reason: e.reason ?? '' })
  }
  // IT people who want cloud but don't code yet: Cloud & DevOps needs coding, so the GenAI & Agentic AI Master (coding
  // taught from scratch, with a Cloud & DevOps specialisation) comes first, and Cloud & DevOps opens once they code.
  if (!now.length && f.it && years1(f) && later.some((l) => ['CD', 'CD-M', 'GAI-CD'].includes(l.code)) && eligibility(CODE_TO_ID['GAI-M'], a).ok) now.push('GAI-M')
  // Nothing in their lead type is open yet: the fresher/no-code start that is (never an empty plan).
  if (!now.length) {
    const open = ['AAP', 'DABA', 'DSG-C'].find((c) => eligibility(CODE_TO_ID[c], a).ok) ?? 'AAP'
    now.push(open)
  }
  const kinds: PathKind[] = ['recommend', 'next', 'more']
  const picked: { code: string; reason: string }[] = [...now.map((code) => ({ code, reason: '' })), ...later].slice(0, 3)
  const options: PathOption[] = picked.map((x, i) => {
    const id = CODE_TO_ID[x.code]
    const program = getProgram(id)
    const e = eligibility(id, a)
    const kind = kinds[i]
    const reason = x.reason
    return {
      code: x.code, programId: id, name: program.name, kind,
      // The match with their lead type sets the top score; each later option sits one below.
      fit: Math.max(5, Math.min(10, FIT[kind] + (i === 0 && top.score >= 80 ? 1 : 0) - (e.confirm ? 1 : 0) - (reason ? 2 : 0))),
      why: i === 0 ? persona.why : KIND_WHY[kind],
      ...(reason ? { later: reason } : {}),
      ...(e.confirm ? { confirm: e.confirm } : {}),
    }
  })
  const second = ranked.find((p) => p.id !== top.id)?.score ?? 0
  const match = Math.max(60, Math.min(98, 60 + Math.round((top.score - second) / 2) + (top.score >= 80 ? 15 : top.score >= 55 ? 8 : 0)))
  return { persona: top, match, ranked, options, why: options[0].code === persona.primary ? persona.why : REORDER_WHY[options[0].code] ?? `${options[0].name}: ${catalogueWho(options[0].code)}`, note: persona.note }
}

function years1(f: Facts) {
  return (f.years ?? 1) >= 1
}

export type Route = { code: string; persona: string; why: string }

/** The program the map recommends for this learner (the first of their path). */
export function routeFor(a: Answers): Route {
  const p = pathFor(a)
  return { code: p.options[0].code, persona: p.persona.id, why: p.why }
}

/** What the learner sees on their path card: the lead type they match and their three programs, in plain words. */
export type PathCardData = {
  persona: string; match: number; reasons: string[]
  options: { programId: string; name: string; kind: PathKind; fit: number; why: string; note?: string; later: boolean }[]
}
const KIND_LABEL: Record<PathKind, string> = { recommend: 'Recommended', next: 'Next best', more: 'One more option' }
export const pathKindLabel = (k: PathKind) => KIND_LABEL[k]

/** A learner-facing line for an entry rule (the full rule is for the counsellor). */
function plainNote(o: PathOption): string | undefined {
  const r = o.later ?? ''
  if (r) {
    if (/after graduating|completed degree/i.test(r)) return 'Opens after you graduate'
    if (/graduate degree/i.test(r)) return 'Needs a graduate degree'
    if (/work experience/i.test(r)) return 'Opens after a year of work experience'
    if (/IT role/i.test(r)) return 'Needs a year in an IT role'
    if (/write code/i.test(r)) return 'Needs coding experience first'
    return 'Not open to you yet'
  }
  if (o.confirm) {
    if (o.code === 'AIL') return 'Needs 2+ years incl. people or project responsibility'
    if (o.code === 'MCS') return 'Needs a bachelor’s degree with 60%+'
    if (o.code === 'AAP') return 'IIT Patna certificate confirmed on your counselling call'
  }
  return undefined
}

export function pathCard(a: Answers): PathCardData {
  const p = pathFor(a)
  return {
    persona: p.persona.name, match: p.match, reasons: p.persona.reasons.slice(0, 3),
    options: p.options.map((o) => ({ programId: o.programId, name: o.name, kind: o.kind, fit: o.fit, why: o.why, note: plainNote(o), later: Boolean(o.later) })),
  }
}

/** Codes of every program, for checks. */
export const ALL_CODES = PROGRAMS.map((p) => p.code)
