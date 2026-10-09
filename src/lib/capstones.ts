// The capstones shown in "Your plan with Learnbay" (report page and PDF). They must fit the learner: a project written
// for their work profile, one whose theme matches their own words, or one from their industry. A program's library
// can't cover every profile, so projects from closely related programs (same skills taught) count too, and every
// learner also gets a "bring your own project" capstone built from their own work (a real Learnbay option).
// Nothing from an unrelated industry is ever shown as "theirs".

import { profilesFor } from '@/config/profiles'
import { query } from './db'
import { industriesFor, relevance, type Project } from './projects'
import { domainLabel, roleLabel, type Answers } from './questions'

export type Capstone = { title: string; objective: string; outcome: string | null; label: string; own?: boolean }

/** Programs that teach the same core skills: their projects transfer (a little lower in the ranking). */
const RELATED: Record<string, string[]> = {
  'genai-agentic-ai-managers-leaders': ['genai-agentic-ai-master', 'applied-ai-practitioner'],
  'genai-agentic-ai-master': ['genai-agentic-ai-managers-leaders', 'genai-software-developers'],
  'ai-engineering-master': ['genai-software-developers', 'genai-agentic-ai-master', 'forward-deployed-ai-engineer'],
  'applied-ai-practitioner': ['genai-agentic-ai-managers-leaders'],
  'data-business-analytics-genai': ['data-science-genai-program'],
  'data-science-genai-program': ['data-science-genai-master', 'data-business-analytics-genai'],
  'data-science-genai-master': ['data-science-genai-program', 'ms-cs-data-science-ai'],
  'ms-cs-data-science-ai': ['data-science-genai-master'],
  'genai-software-developers': ['sde-genai-agentic-ai', 'genai-agentic-ai-master'],
  'sde-genai-agentic-ai': ['genai-software-developers', 'forward-deployed-ai-engineer'],
  'forward-deployed-ai-engineer': ['sde-genai-agentic-ai', 'genai-software-developers'],
  'cloud-devops-engineering': ['ai-cloud-devops-master', 'genai-agentic-ai-cloud-devops'],
  'ai-cloud-devops-master': ['cloud-devops-engineering', 'genai-agentic-ai-cloud-devops'],
  'genai-agentic-ai-cloud-devops': ['ai-cloud-devops-master', 'cloud-devops-engineering'],
}
/** The only program built without code: projects that need code don't fit it. */
const NO_CODE = new Set(['applied-ai-practitioner'])
const CODE_WORK = /\b(python|pandas|numpy|scikit|pytorch|tensorflow|bert|nltk|spacy|langchain|langgraph|faiss|pinecone|chromadb|hugging ?face|fastapi|oop|perceptron|colab|data structures|mcp sdk|autogen|vector store|embedding)/i
const BASIC = /calculator|simulation|to-?do|number guess|hello world|basic python|temperature convert|grade (calculator|book)/i
const LEADER_PROGRAMS = new Set(['genai-agentic-ai-managers-leaders'])
const LEADER_ROLES = new Set(['project-manager', 'product-manager', 'consultant', 'founder', 'business-owner'])
/** Answers that mean "nothing to say". */
const EMPTY = /^(no idea|none|nothing|na|n\/a|nil|not sure|no|-|\.)$/i

/** No work history to build on: students and freshers. */
const isFresher = (a: Answers) => a.role === 'student' || a.domain === 'student' || a.experience === '0'

/** The learner's own-work capstone: from their roadmap's tailored project when there is one, else from their answers. */
function ownCapstone(a: Answers, idea?: { title: string; description: string }): Capstone {
  if (idea) return { title: idea.title, objective: idea.description, outcome: null, label: 'Your own work · bring your own project', own: true }
  if (isFresher(a)) {
    return { title: 'A capstone on a problem you care about', objective: 'Pick a real problem from the industry you want to join and build your capstone on it. Your mentors help you shape the problem statement and guide you to a working solution you can show in interviews.', outcome: null, label: 'Your choice · bring your own project', own: true }
  }
  const role = roleLabel(a)
  const industry = domainLabel(a)
  const tools = a.toolsUsed && !EMPTY.test(a.toolsUsed.trim()) ? a.toolsUsed.trim() : ''
  const problem = a.workProblem && !EMPTY.test(a.workProblem.trim()) && a.workProblem.trim().length > 5 ? a.workProblem.trim() : ''
  const who = [role, industry].filter((x) => x && x !== 'Not specified' && x !== 'Other').join(', ')
  return {
    title: problem ? `Solve “${problem.length > 70 ? `${problem.slice(0, 67)}…` : problem}” with AI` : 'An AI project from your own work',
    objective: `Bring a real problem from your day-to-day work${who ? ` (${who})` : ''}${tools ? `, built around the tools you use: ${tools}` : ''}, and make it your capstone. Your mentors guide you from the problem statement to a working solution you can show.`,
    outcome: null,
    label: 'Your own work · bring your own project',
    own: true,
  }
}

/**
 * Up to two library capstones that fit this learner (most relevant first), then their own-work capstone.
 * `ideas`: projects already tailored to them (the roadmap's), used for the own-work capstone and as a second idea.
 */
export async function capstonesFor(programId: string, a: Answers, ideas: { title: string; description: string }[] = []): Promise<Capstone[]> {
  const programs = [programId, ...(RELATED[programId] ?? [])]
  const rows = await query<Project>(
    `SELECT id, title, description, tools, kind, module, domain, programs, source, source_ref, status, objective, outcome, industry, catalogue_ref, profiles
       FROM projects WHERE status = 'active' AND programs && $1::text[]`,
    [programs],
  ).catch(() => [] as Project[])
  const mine = profilesFor(a)
  const industries = industriesFor(a)
  const leader = LEADER_PROGRAMS.has(programId) || LEADER_ROLES.has(a.role ?? '')
  const scored = rows.flatMap((p) => {
    if (NO_CODE.has(programId) && CODE_WORK.test(`${p.title} ${p.tools.join(' ')}`)) return []
    if (BASIC.test(p.title)) return []
    const profile = p.profiles?.some((k) => mine.includes(k)) ? 10 : 0
    const theme = Math.min(3, relevance(p, a)) * 3
    const at = p.industry ? industries.indexOf(p.industry) : -1
    const industry = at === 0 ? 6 : at > 0 ? 4 : 0
    const lead = leader && p.industry === 'Cross-industry leadership' ? 2 : 0
    const personal = profile + theme + industry + lead
    if (!personal) return []
    const own = p.programs.includes(programId) ? 2 : 0
    return [{ p, w: personal + own + (p.kind === 'capstone' ? 1 : 0) + (p.catalogue_ref ? 1 : 0) }]
  }).sort((x, y) => y.w - x.w || x.p.title.localeCompare(y.p.title))
  const picked: Capstone[] = []
  for (const { p } of scored) {
    if (picked.length >= 2) break
    if (picked.some((x) => x.title === p.title)) continue
    picked.push({ title: p.title, objective: p.objective || p.description, outcome: p.outcome ?? null, label: `${p.industry ?? 'Your field'} · capstone` })
  }
  // Freshers have no industry yet: the program's own capstones, honestly labelled as samples (two different industries).
  if (!picked.length && isFresher(a)) {
    const seen = new Set<string>()
    for (const p of rows.filter((x) => x.programs.includes(programId) && x.kind === 'capstone' && x.catalogue_ref).sort((x, y) => x.title.localeCompare(y.title))) {
      if (picked.length >= 2 || seen.has(p.industry ?? '')) continue
      seen.add(p.industry ?? '')
      picked.push({ title: p.title, objective: p.objective || p.description, outcome: p.outcome ?? null, label: `Sample capstone · ${p.industry ?? 'cross-industry'}` })
    }
  }
  // Too few library matches: a second idea tailored to them (from their roadmap) fills in.
  if (picked.length < 2 && ideas[1]) picked.push({ title: ideas[1].title, objective: ideas[1].description, outcome: null, label: 'Tailored to you · capstone idea' })
  return [...picked, ownCapstone(a, ideas[0])]
}
