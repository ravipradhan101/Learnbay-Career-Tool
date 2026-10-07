// The project library: what learners see as "Projects you'll build". Projects come from the brochures (and projects
// written in the same style), are edited in Admin → Projects, and are picked per learner: their program first, their
// industry's domain projects where the program offers that specialisation, and a rotation so every showing mixes
// 1-2 projects they've seen with 2-3 new ones.

import { query } from './db'
import { domainKeysFor } from './project-roles'
import type { Answers } from './questions'

export type Project = {
  id: string; title: string; description: string; tools: string[]
  kind: 'module' | 'capstone' | 'domain'; module: string | null; domain: string | null
  programs: string[]; source: 'brochure' | 'generated' | 'admin'; source_ref: string | null; status: 'active' | 'paused'
  /** 2026 catalogue projects: what it sets out to do, what the learner achieves, and its industry. */
  objective?: string | null; outcome?: string | null; industry?: string | null; catalogue_ref?: string | null
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

/** Old library projects that need code: never shown for the no-code programs (rewritten without code in 2026). */
const NO_CODE_PROGRAMS = new Set(['applied-ai-practitioner', 'genai-agentic-ai-managers-leaders'])
const CODE_WORK = /\b(python|pandas|numpy|scikit|pytorch|tensorflow|bert|nltk|spacy|langchain|langgraph|faiss|pinecone|chromadb|hugging ?face|fastapi|oop|perceptron|colab|data structures|mcp sdk|autogen|vector store|embedding)/i

export async function pickProjects(userId: string | null, programId: string, who: Answers, count = 4): Promise<Project[]> {
  const domains = await domainKeysFor(programId, who)
  const industries = industriesFor(who)
  const role = who.role
  const domain = domains[0] ?? null
  const myRoleProgram = role ? ROLE_PROGRAM_FOR[role] : undefined
  const pool = await query<Project & { shown_at: Date | null }>(
    `SELECT p.id, p.title, p.description, p.tools, p.kind, p.module, p.domain, p.programs, p.source, p.source_ref, p.status,
            p.objective, p.outcome, p.industry, p.catalogue_ref, v.shown_at
       FROM projects p LEFT JOIN project_views v ON v.project_id = p.id AND v.user_id = $3
      WHERE p.status = 'active' AND $1 = ANY(p.programs) AND (p.domain IS NULL OR p.domain = ANY($2::text[]))`,
    [programId, domains, userId],
  )
  // A project that belongs to exactly one role program (e.g. a DBA elective capstone) is only for learners in that role.
  const fits = (p: Project) => {
    const roles = p.programs.filter((id) => ROLE_PROGRAMS.includes(id))
    if (NO_CODE_PROGRAMS.has(programId) && !p.catalogue_ref && CODE_WORK.test(`${p.title} ${p.tools.join(' ')}`)) return false
    return roles.length !== 1 || roles[0] === programId || roles[0] === myRoleProgram
  }
  const eligible = pool.filter(fits)
  if (!eligible.length) return []
  pool.splice(0, pool.length, ...eligible)
  const seen = pool.filter((p) => p.shown_at).sort((a, b) => +new Date(b.shown_at!) - +new Date(a.shown_at!))
  // New ones in a random order, but real portfolio work first: capstones and specialisation projects, basic exercises last.
  // The 2026 catalogue projects (with objective and outcome) lead, especially those from the learner's own industry.
  const weight = (p: Project) => (p.kind === 'capstone' || p.domain ? 3 : 1) - (BASIC.test(p.title) ? 3 : 0) + (p.catalogue_ref ? 4 : 0)
    + (p.industry && industries.includes(p.industry) ? 4 : 0) + Math.random()
  const unseen = shuffle(pool.filter((p) => !p.shown_at)).map((p) => ({ p, w: weight(p) })).sort((x, y) => y.w - x.w).map((x) => x.p)
  const picked: typeof pool = []
  const take = (p: (typeof pool)[number] | undefined) => { if (p && !picked.some((x) => x.id === p.id) && picked.length < count) picked.push(p) }
  // Keep 1-2 from before (when they've seen some), then new ones: their role or industry first, a capstone, then the rest.
  for (const p of shuffle(seen.slice(0, 4)).slice(0, seen.length ? (Math.random() < 0.5 ? 1 : 2) : 0)) take(p)
  take(unseen.find((p) => p.industry && p.industry === industries[0]))
  if (domain) take(unseen.find((p) => p.domain === domain))
  take(unseen.find((p) => p.kind === 'capstone'))
  for (const p of unseen) take(p)
  // Everything seen already: fall back to the ones shown longest ago.
  for (const p of [...seen].reverse()) take(p)
  const out = shuffle(picked)
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
  const rows = await query<{ title: string; objective: string | null; outcome: string | null; industry: string | null; tools: string[] }>(
    `SELECT title, objective, outcome, industry, tools FROM projects
      WHERE status = 'active' AND $1 = ANY(programs) AND (domain IS NULL OR domain = ANY($2::text[]))
      ORDER BY (industry = ANY($3::text[])) DESC NULLS LAST, (catalogue_ref IS NOT NULL) DESC, (kind = 'capstone') DESC, title LIMIT $4`,
    [programId, await domainKeysFor(programId, who), industries, limit],
  )
  return rows.map((r) => (r.objective ? `${r.title} (${r.industry}): goal: ${r.objective} Result: ${r.outcome} Tools: ${r.tools.join(', ')}` : r.title))
}
