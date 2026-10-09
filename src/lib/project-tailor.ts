// Projects in the learner's own context. The library project stays the same project (same tools, same scope); the AI
// only rewrites its goal and result for this person ("for a paint-shop robotics engineer: ..."). When the library has
// little that fits an unusual profile, it also proposes up to two "bring your own project" ideas. Those are shown to the
// learner as ideas and queued for an admin, who can approve a good one into the library with one click, so the next
// learner like them gets it from the library. Results are cached per learner and context; failures fall back to the
// library text, never to an error.

import { CATALOGUE, ID_TO_CODE } from '@/config/catalogue'
import { learnerWords, profilesFor } from '@/config/profiles'
import { getProgram } from '@/config/programs'
import { query } from './db'
import { generateJson } from './gemini'
import type { Project } from './projects'
import { relevance } from './projects'
import type { Answers } from './questions'
import { experienceLabel, roleLabel, targetRoleLabel } from './questions'
import { overLimit, rateLimit, sha256 } from './security'

export type Tailored = { objective: string; outcome: string | null }
export type ProjectIdea = { id: string; title: string; objective: string; outcome: string | null; tools: string[]; industry: string | null }

/** Claims a project text must never make. */
const UNSAFE = /guarantee|assured|job offer|placement|salary|\blpa\b|lakh|hike|100%|certif(y|ied) you/i

/** Tools this program's own projects use: the only tools an idea may suggest. */
function programTools(programId: string): string[] {
  const code = ID_TO_CODE[programId]
  const tools = CATALOGUE.projects.filter((p) => p.programs.includes(code)).flatMap((p) => p.tools)
  return [...new Set(tools)].slice(0, 60)
}

/** What we know about the learner, in plain lines (no name, email or phone). */
function brief(a: Answers): string {
  return [
    `Role: ${roleLabel(a)}`, `Experience: ${experienceLabel(a)}`, `Target role: ${targetRoleLabel(a)}`,
    ...(a.toolsUsed ? [`Tools they use: ${a.toolsUsed}`] : []), ...(a.workProblem ? [`Problem they want AI to solve: ${a.workProblem}`] : []),
    ...(a.domain ? [`Industry: ${a.domainOther || a.domain}`] : []),
  ].join('\n')
}

const contextHash = (a: Answers, programId: string) =>
  sha256(JSON.stringify([programId, a.role, a.roleOther, a.domain, a.domainOther, a.toolsUsed, a.workProblem, a.experience, a.targetRole])).slice(0, 24)

const SCHEMA = {
  type: 'object',
  properties: {
    projects: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, objective: { type: 'string' }, outcome: { type: 'string' } }, required: ['id', 'objective', 'outcome'] } },
    ideas: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, objective: { type: 'string' }, outcome: { type: 'string' }, tools: { type: 'array', items: { type: 'string' } }, industry: { type: 'string' } }, required: ['title', 'objective', 'outcome', 'tools'] } },
  },
  required: ['projects', 'ideas'],
}

const SYSTEM = `You tailor Learnbay course projects to one learner. Rules:
- Keep each project the SAME project: same tools, same scope, same kind of result. Only rewrite its goal and result so they use the learner's own world (their industry, tools, data and daily problems). Be concrete: name their machines, documents, data or customers.
- Goal: one sentence, at most 35 words. Result: one sentence, at most 25 words, about what the project shows or does (never jobs, salaries, hikes, placements or guarantees).
- Ideas (only when asked): projects the learner could bring from their own work and build in this course. Use ONLY tools from the course tool list. Each must fit 4-6 weeks, use data they could realistically get or simulate, and show a clear business result. Title at most 8 words. Never repeat a library project.
- Plain English, Indian context, no hype words, no emojis.`

/**
 * Tailored goal and result for each project (by project id), and ideas when the library fits them poorly. Cached per
 * learner; a new call to the AI happens only when their profile or program changes.
 */
export async function tailorProjects(userId: string, programId: string, a: Answers, projects: Project[]): Promise<{ tailored: Record<string, Tailored>; ideas: ProjectIdea[] }> {
  if (!projects.length) return { tailored: {}, ideas: [] }
  const hash = contextHash(a, programId)
  const cached = await query<{ project_id: string; objective: string; outcome: string | null }>(
    `SELECT project_id, objective, outcome FROM project_tailoring WHERE user_id = $1 AND context_hash = $2 AND project_id = ANY($3::uuid[])`,
    [userId, hash, projects.map((p) => p.id)],
  )
  const tailored: Record<string, Tailored> = Object.fromEntries(cached.map((r) => [r.project_id, { objective: r.objective, outcome: r.outcome }]))
  let ideas = await learnerIdeas(userId, programId)
  const missing = projects.filter((p) => !tailored[p.id])

  // Unusual profile: little in the library fits them, and they told us enough to propose something real.
  const mine = profilesFor(a)
  const fitting = projects.filter((p) => p.profiles?.some((k) => mine.includes(k)) || relevance(p, a) > 0).length
  // Ideas are asked for at most once a week per learner and program (even if none came back), never in a loop.
  const ideasKey = `ideas:asked:${userId}:${programId}`
  const wantIdeas = !ideas.length && fitting < 2 && Boolean(learnerWords(a) || a.domain) && !(await overLimit(ideasKey, 1, 7 * 86_400))

  if (!missing.length && !wantIdeas) return { tailored, ideas }
  // A ceiling on tailoring across everyone, so a burst of traffic (or abuse) can't run up the AI bill.
  if (!(await rateLimit('projects:ai:global', 3000, 3600))) return { tailored, ideas }
  if (wantIdeas) await rateLimit(ideasKey, 1, 7 * 86_400)
  const program = getProgram(programId)
  try {
    const out = await generateJson<{ projects: { id: string; objective: string; outcome: string }[]; ideas: { title: string; objective: string; outcome: string; tools: string[]; industry?: string }[] }>({
      system: SYSTEM,
      contents: [{ role: 'user', parts: [{ text: `THE LEARNER:\n${brief(a)}\n\nTHE COURSE: ${program.name}\nCOURSE TOOL LIST: ${programTools(programId).join(', ')}\n\nPROJECTS TO TAILOR (keep each id):\n${missing.map((p) => `- id ${p.id}: ${p.title}. Goal: ${p.objective ?? p.description}${p.outcome ? ` Result: ${p.outcome}` : ''} Tools: ${p.tools.join(', ')}`).join('\n')}\n\n${wantIdeas ? 'Also give 2 ideas they could bring from their own work.' : 'Give no ideas (empty list).'}` }] }],
      jsonSchema: SCHEMA, temperature: 0.4, maxOutputTokens: 1600, thinkingBudget: 0, timeoutMs: 20_000,
      usage: { userId, feature: 'projects:tailor' },
    })
    const ids = new Set(missing.map((p) => p.id))
    for (const t of out.projects ?? []) {
      if (!ids.has(t.id) || !t.objective || UNSAFE.test(`${t.objective} ${t.outcome}`)) continue
      const row = { objective: t.objective.slice(0, 320), outcome: t.outcome ? t.outcome.slice(0, 240) : null }
      tailored[t.id] = row
      await query(
        `INSERT INTO project_tailoring (user_id, project_id, context_hash, objective, outcome) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, project_id) DO UPDATE SET context_hash = EXCLUDED.context_hash, objective = EXCLUDED.objective, outcome = EXCLUDED.outcome, created_at = now()`,
        [userId, t.id, hash, row.objective, row.outcome],
      )
    }
    if (wantIdeas) {
      const allowed = new Set(programTools(programId).map((t) => t.toLowerCase()))
      for (const idea of (out.ideas ?? []).slice(0, 2)) {
        if (!idea.title || !idea.objective || UNSAFE.test(`${idea.title} ${idea.objective} ${idea.outcome}`)) continue
        const tools = (idea.tools ?? []).filter((t) => allowed.has(t.toLowerCase())).slice(0, 5)
        await saveIdea(userId, programId, mine, a, { ...idea, tools })
      }
      ideas = await learnerIdeas(userId, programId)
    }
  } catch (err) {
    console.error('[projects] tailoring failed', (err as Error).message)
  }
  return { tailored, ideas }
}

async function saveIdea(userId: string, programId: string, profiles: string[], a: Answers, idea: { title: string; objective: string; outcome: string; tools: string[]; industry?: string }) {
  const row = await query<{ id: string; inserted: boolean }>(
    `INSERT INTO project_ideas (title, objective, outcome, tools, program_id, profiles, industry, learner_brief)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (lower(title), program_id) DO UPDATE SET seen = project_ideas.seen + 1, last_seen_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [idea.title.slice(0, 120), idea.objective.slice(0, 400), idea.outcome?.slice(0, 300) ?? null, idea.tools, programId, profiles, idea.industry?.slice(0, 60) ?? null, brief(a).slice(0, 600)],
  )
  // A learner only sees ideas written for them: one first written for someone else (from their work details) just counts
  // as demand for the admin, until it is approved into the library.
  if (row[0]?.inserted) await query(`INSERT INTO project_idea_learners (idea_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [row[0].id, userId])
}

/** Ideas proposed for this learner in this program (rejected ones are not shown). */
async function learnerIdeas(userId: string, programId: string): Promise<ProjectIdea[]> {
  return query<ProjectIdea>(
    `SELECT i.id, i.title, i.objective, i.outcome, i.tools, i.industry FROM project_ideas i JOIN project_idea_learners l ON l.idea_id = i.id
      WHERE l.user_id = $1 AND i.program_id = $2 AND i.status = 'pending' ORDER BY l.created_at LIMIT 2`,
    [userId, programId],
  )
}
