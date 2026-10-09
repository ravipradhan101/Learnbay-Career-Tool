// The project library: what learners see as "Projects you'll build". Projects come from the brochures (and projects
// written in the same style), are edited in Admin → Projects, and are picked per learner: their program first, their
// industry's domain projects where the program offers that specialisation, and a rotation so every showing mixes
// 1-2 projects they've seen with 2-3 new ones.

import { learnerWords, profilesFor } from '@/config/profiles'
import { query } from './db'
import { domainKeysFor } from './project-roles'
import type { Answers } from './questions'

export type Project = {
  id: string; title: string; description: string; tools: string[]
  kind: 'module' | 'capstone' | 'domain'; module: string | null; domain: string | null
  programs: string[]; source: 'brochure' | 'generated' | 'admin'; source_ref: string | null; status: 'active' | 'paused'
  /** 2026 catalogue projects: what it sets out to do, what the learner achieves, and its industry. */
  objective?: string | null; outcome?: string | null; industry?: string | null; catalogue_ref?: string | null
  /** Work profiles this project was written for (config/profiles). */
  profiles?: string[]
}

export { PROJECT_DOMAINS } from './project-domains'

const shuffle = <T,>(list: T[]) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/**
 * Four projects for this learner and program: 1-2 they have seen before (so the story stays consistent) and the rest
 * new; at least one from their industry when the program offers that domain; a capstone when there is one.
 * Records what was shown.
 */
/** Warm-up exercises (still in the library, just not what we lead with). */
const BASIC = /calculator|simulation|to-?do|number guess|hello world|basic python|temperature convert|grade (calculator|book)/i

/** Cloud & DevOps role programs: their capstones also appear in the master's role electives. */
const ROLE_PROGRAMS = ['cloud-devops-network', 'cloud-devops-sysadmin', 'cloud-devops-it-support-ops', 'cloud-devops-dba', 'cloud-devops-qa-testers']
const ROLE_PROGRAM_FOR: Record<string, string> = {
  'network-admin': 'cloud-devops-network', sysadmin: 'cloud-devops-sysadmin', 'it-support': 'cloud-devops-it-support-ops', dba: 'cloud-devops-dba', 'qa-engineer': 'cloud-devops-qa-testers',
}

/** The catalogue industries closest to the learner: their industry (or their own words for it), else their role's world. */
const INDUSTRY_OF_DOMAIN: Record<string, string[]> = {
  bfsi: ['Banking & BFSI', 'Insurance', 'Fintech & Payments'], healthcare: ['Healthcare', 'Pharma & Life Sciences'],
  manufacturing: ['Manufacturing', 'Automotive & Mobility', 'Energy & Utilities'], retail: ['Retail & E-commerce', 'Food-tech & Quick Commerce'],
  telecom: ['Telecom'], education: ['Education & EdTech'], government: ['Public Sector'], 'it-services': ['IT Services & SaaS'], product: ['IT Services & SaaS'],
}
const INDUSTRY_OF_ROLE: Record<string, string[]> = {
  marketing: ['Marketing & Advertising', 'Media & Entertainment'], designer: ['Marketing & Advertising', 'Media & Entertainment'], content: ['Media & Entertainment', 'Marketing & Advertising'],
  hr: ['HR & People'], 'banking-finance': ['Banking & BFSI', 'Insurance', 'Fintech & Payments'], operations: ['Supply Chain & Logistics', 'Manufacturing'],
  teacher: ['Education & EdTech'], sales: ['Real Estate & Construction', 'Retail & E-commerce'], consultant: ['Cross-industry leadership', 'Legal & Compliance'],
  'project-manager': ['Cross-industry leadership'], 'product-manager': ['IT Services & SaaS', 'Cross-industry leadership'],
  'software-engineer': ['IT Services & SaaS'], 'qa-engineer': ['IT Services & SaaS'], 'devops-cloud': ['IT Services & SaaS'],
}
const INDUSTRY_WORDS: [RegExp, string][] = [
  [/logistic|supply|warehouse|shipping/i, 'Supply Chain & Logistics'], [/legal|law|compliance/i, 'Legal & Compliance'], [/real estate|construction|property/i, 'Real Estate & Construction'],
  [/travel|hotel|hospitality|tourism/i, 'Travel & Hospitality'], [/agri|farm/i, 'Agriculture'], [/energy|power|utilit|oil|gas/i, 'Energy & Utilities'],
  [/media|entertain|film|music|news/i, 'Media & Entertainment'], [/food|restaurant|delivery|quick commerce/i, 'Food-tech & Quick Commerce'],
  [/auto|vehicle|mobility/i, 'Automotive & Mobility'], [/insur/i, 'Insurance'], [/pharma|life science/i, 'Pharma & Life Sciences'],
]
export function industriesFor(who: Answers): string[] {
  const own = who.domain === 'other' && who.domainOther ? INDUSTRY_WORDS.filter(([re]) => re.test(who.domainOther!)).map(([, d]) => d) : []
  return [...new Set([...own, ...(INDUSTRY_OF_DOMAIN[who.domain ?? ''] ?? []), ...(INDUSTRY_OF_ROLE[who.role ?? ''] ?? [])])]
}

/**
 * Work themes: when the learner's own words (typed role, industry, skills, goal) mention a theme, projects about that
 * theme rank first. One table covers thousands of profiles; add a row when a new kind of learner shows up.
 */
const THEMES: { learner: RegExp; project: RegExp }[] = [
  { learner: /robot|offline program|olp|path plan|trajector/i, project: /robot|path|trajector|collision|reachab|cycle[- ]time/i },
  { learner: /paint|coat|spray|sealer|finish/i, project: /paint|coat|defect|finish|surface/i },
  { learner: /plc|scada|automation|mechatronic|instrument|hmi|iiot|iot|sensor/i, project: /plc|scada|sensor|iot|telemetry|anomal|predictive|automation/i },
  { learner: /quality|inspection|qc\b|qa engineer|six sigma|kaizen|8d|sop/i, project: /quality|defect|inspection|sop|8d|non-?conformance|root[- ]cause|scrap/i },
  { learner: /maintenance|reliability|breakdown|downtime/i, project: /maintenance|downtime|mtbf|failure|fault|troubleshoot/i },
  { learner: /production|manufactur|plant|assembly|shop ?floor|line\b|process engineer|industrial engineer/i, project: /production|oee|shift|throughput|assembly|line|manufactur|cycle[- ]time|bottleneck/i },
  { learner: /simulat|digital twin|virtual commission|cad|cae/i, project: /simulat|digital twin|cad|virtual|optimi[sz]/i },
  { learner: /automotive|vehicle|car\b|auto\b|oem/i, project: /vehicle|automotive|car\b|diagnos/i },
  { learner: /supply|logistic|warehouse|procure|inventory/i, project: /supply|logistic|warehouse|inventory|forecast|freight|procure/i },
  { learner: /bank|credit|loan|risk|fraud|insur|financ/i, project: /bank|credit|loan|risk|fraud|insur|claim|financ/i },
  { learner: /hospital|clinic|pharma|health|medical|patient/i, project: /hospital|clinic|pharma|health|medical|patient|claim/i },
  { learner: /retail|e-?commerce|store|fmcg|merchandis/i, project: /retail|e-?commerce|store|product listing|recommend|basket|sku/i },
  { learner: /telecom|network|noc|bss|oss/i, project: /telecom|network|churn|outage|noc/i },
  { learner: /hr\b|recruit|talent|people ops/i, project: /hr\b|recruit|resume|talent|attrition|employee/i },
  { learner: /market|brand|campaign|seo|content/i, project: /market|campaign|brand|seo|content|ad\b/i },
  { learner: /sales|crm|lead|account manag/i, project: /sales|crm|lead|pipeline|deal/i },
  { learner: /support|service desk|helpdesk|ticket/i, project: /support|ticket|helpdesk|service desk/i },
]

/** How closely a project matches what the learner told us (0 = no theme in common). */
export function relevance(p: Pick<Project, 'title' | 'description' | 'objective' | 'tools'>, who: Answers): number {
  const mine = [learnerWords(who), who.domain, ...(who.skills ?? [])].filter(Boolean).join(' ')
  if (!mine) return 0
  const text = `${p.title} ${p.description} ${p.objective ?? ''} ${p.tools.join(' ')}`
  return THEMES.filter((t) => t.learner.test(mine) && t.project.test(text)).length
}

/** Old library projects that need code: never shown for the no-code programs (rewritten without code in 2026). */
const NO_CODE_PROGRAMS = new Set(['applied-ai-practitioner', 'genai-agentic-ai-managers-leaders'])
const CODE_WORK = /\b(python|pandas|numpy|scikit|pytorch|tensorflow|bert|nltk|spacy|langchain|langgraph|faiss|pinecone|chromadb|hugging ?face|fastapi|oop|perceptron|colab|data structures|mcp sdk|autogen|vector store|embedding)/i

export async function pickProjects(userId: string | null, programId: string, who: Answers, count = 4): Promise<Project[]> {
  const domains = await domainKeysFor(programId, who)
  const industries = industriesFor(who)
  const mine = profilesFor(who)
  const role = who.role
  const domain = domains[0] ?? null
  const myRoleProgram = role ? ROLE_PROGRAM_FOR[role] : undefined
  const pool = await query<Project & { shown_at: Date | null }>(
    `SELECT p.id, p.title, p.description, p.tools, p.kind, p.module, p.domain, p.programs, p.source, p.source_ref, p.status,
            p.objective, p.outcome, p.industry, p.catalogue_ref, p.profiles, v.shown_at
       FROM projects p LEFT JOIN project_views v ON v.project_id = p.id AND v.user_id = $3
      WHERE p.status = 'active' AND $1 = ANY(p.programs) AND (p.domain IS NULL OR p.domain = ANY($2::text[]))`,
    [programId, domains, userId],
  )
  const forMe = (p: Project) => Boolean(p.profiles?.some((k) => mine.includes(k)))
  // A project that belongs to exactly one role program (e.g. a DBA elective capstone) is only for learners in that role.
  // A project written for a work profile (a robotics or CA project) is only for learners in that profile, or whose
  // own words match its theme.
  const fits = (p: Project) => {
    const roles = p.programs.filter((id) => ROLE_PROGRAMS.includes(id))
    if (NO_CODE_PROGRAMS.has(programId) && !p.catalogue_ref && CODE_WORK.test(`${p.title} ${p.tools.join(' ')}`)) return false
    if (p.source_ref?.startsWith('profile:') && !forMe(p) && relevance(p, who) === 0) return false
    return roles.length !== 1 || roles[0] === programId || roles[0] === myRoleProgram
  }
  const eligible = pool.filter(fits)
  if (!eligible.length) return []
  pool.splice(0, pool.length, ...eligible)
  const seen = pool.filter((p) => p.shown_at).sort((a, b) => +new Date(b.shown_at!) - +new Date(a.shown_at!))
  // New ones in a random order, but the most relevant first: projects written for their work profile, projects whose
  // theme matches their own words, their industry, then capstones and specialisation projects; basic exercises last.
  const weight = (p: Project) => (forMe(p) ? 8 : 0) + Math.min(3, relevance(p, who)) * 2
    + (p.kind === 'capstone' || p.domain ? 3 : 1) - (BASIC.test(p.title) ? 3 : 0) + (p.catalogue_ref ? 2 : 0)
    + (p.industry && industries.includes(p.industry) ? 3 : 0) + Math.random()
  const unseen = shuffle(pool.filter((p) => !p.shown_at)).map((p) => ({ p, w: weight(p) })).sort((x, y) => y.w - x.w).map((x) => x.p)
  const picked: typeof pool = []
  const take = (p: (typeof pool)[number] | undefined) => { if (p && !picked.some((x) => x.id === p.id) && picked.length < count) picked.push(p) }
  // Keep 1-2 from before (when they've seen some), then new ones: their profile's first, their industry, a capstone, then the rest.
  for (const p of shuffle(seen.slice(0, 4)).slice(0, seen.length ? (Math.random() < 0.5 ? 1 : 2) : 0)) take(p)
  for (const p of unseen.filter(forMe).slice(0, 2)) take(p)
  take(unseen.find((p) => p.industry && p.industry === industries[0]))
  if (domain) take(unseen.find((p) => p.domain === domain))
  take(unseen.find((p) => p.kind === 'capstone'))
  for (const p of unseen) take(p)
  // Everything seen already: fall back to the ones shown longest ago.
  for (const p of [...seen].reverse()) take(p)
  // Most relevant first on the card.
  const out = picked.map((p) => ({ p, w: (forMe(p) ? 8 : 0) + relevance(p, who) * 2 + Math.random() })).sort((x, y) => y.w - x.w).map((x) => x.p)
  if (userId && out.length) {
    await query(
      `INSERT INTO project_views (user_id, project_id) SELECT $1, unnest($2::uuid[])
       ON CONFLICT (user_id, project_id) DO UPDATE SET shown_at = now()`,
      [userId, out.map((p) => p.id)],
    ).catch(() => {})
  }
  return out.map(({ shown_at: _s, ...p }) => p)
}

/**
 * Projects for a program, for the counsellor's knowledge: catalogue projects from the learner's industry first, each
 * with its objective and what they achieve, then the rest of the library by title.
 */
export async function projectTitles(programId: string, who: Answers, limit = 12): Promise<string[]> {
  const industries = industriesFor(who)
  const mine = profilesFor(who)
  const rows = await query<{ title: string; description: string; objective: string | null; outcome: string | null; industry: string | null; tools: string[]; profiles: string[]; source_ref: string | null }>(
    `SELECT title, description, objective, outcome, industry, tools, profiles, source_ref FROM projects
      WHERE status = 'active' AND $1 = ANY(programs) AND (domain IS NULL OR domain = ANY($2::text[]))
      ORDER BY (profiles && $5::text[]) DESC, (industry = ANY($3::text[])) DESC NULLS LAST, (catalogue_ref IS NOT NULL) DESC, (kind = 'capstone') DESC, title LIMIT $4`,
    [programId, await domainKeysFor(programId, who), industries, limit * 3, mine],
  ).then((list) => list
    .filter((r) => !r.source_ref?.startsWith('profile:') || r.profiles.some((k) => mine.includes(k)) || relevance(r, who) > 0)
    .map((r, i) => ({ r, w: (r.profiles.some((k) => mine.includes(k)) ? 100 : 0) + relevance(r, who) * 10 - i * 0.01 }))
    .sort((x, y) => y.w - x.w).slice(0, limit).map((x) => x.r))
  return rows.map((r) => (r.objective ? `${r.title} (${r.industry}): goal: ${r.objective} Result: ${r.outcome} Tools: ${r.tools.join(', ')}` : r.title))
}
