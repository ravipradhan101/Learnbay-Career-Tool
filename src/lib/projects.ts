// The project library: what learners see as "Projects you'll build". Projects come from the brochures (and projects
// written in the same style), are edited in Admin → Projects, and are picked per learner: their program first, their
// industry's domain projects where the program offers that specialisation, and a rotation so every showing mixes
// 1-2 projects they've seen with 2-3 new ones.

import { query } from './db'
import { domainsFor } from './project-domains'

export type Project = {
  id: string; title: string; description: string; tools: string[]
  kind: 'module' | 'capstone' | 'domain'; module: string | null; domain: string | null
  programs: string[]; source: 'brochure' | 'generated' | 'admin'; source_ref: string | null; status: 'active' | 'paused'
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

export async function pickProjects(userId: string | null, programId: string, industry?: string, count = 4, role?: string): Promise<Project[]> {
  const domains = domainsFor(programId, industry, role)
  const domain = domains[0] ?? null
  const myRoleProgram = role ? ROLE_PROGRAM_FOR[role] : undefined
  const pool = await query<Project & { shown_at: Date | null }>(
    `SELECT p.id, p.title, p.description, p.tools, p.kind, p.module, p.domain, p.programs, p.source, p.source_ref, p.status, v.shown_at
       FROM projects p LEFT JOIN project_views v ON v.project_id = p.id AND v.user_id = $3
      WHERE p.status = 'active' AND $1 = ANY(p.programs) AND (p.domain IS NULL OR p.domain = ANY($2::text[]))`,
    [programId, domains, userId],
  )
  // A project that belongs to exactly one role program (e.g. a DBA elective capstone) is only for learners in that role.
  const fits = (p: Project) => {
    const roles = p.programs.filter((id) => ROLE_PROGRAMS.includes(id))
    return roles.length !== 1 || roles[0] === programId || roles[0] === myRoleProgram
  }
  const eligible = pool.filter(fits)
  if (!eligible.length) return []
  pool.splice(0, pool.length, ...eligible)
  const seen = pool.filter((p) => p.shown_at).sort((a, b) => +new Date(b.shown_at!) - +new Date(a.shown_at!))
  // New ones in a random order, but real portfolio work first: capstones and specialisation projects, basic exercises last.
  const weight = (p: Project) => (p.kind === 'capstone' || p.domain ? 3 : 1) - (BASIC.test(p.title) ? 3 : 0) + Math.random()
  const unseen = shuffle(pool.filter((p) => !p.shown_at)).map((p) => ({ p, w: weight(p) })).sort((x, y) => y.w - x.w).map((x) => x.p)
  const picked: typeof pool = []
  const take = (p: (typeof pool)[number] | undefined) => { if (p && !picked.some((x) => x.id === p.id) && picked.length < count) picked.push(p) }
  // Keep 1-2 from before (when they've seen some), then new ones: their industry first, a capstone, then the rest.
  for (const p of shuffle(seen.slice(0, 4)).slice(0, seen.length ? (Math.random() < 0.5 ? 1 : 2) : 0)) take(p)
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

/** Project titles for a program (for the counsellor's knowledge), capstones and the learner's domain first. */
export async function projectTitles(programId: string, industry?: string, limit = 12, role?: string): Promise<string[]> {
  const rows = await query<{ title: string }>(
    `SELECT title FROM projects WHERE status = 'active' AND $1 = ANY(programs) AND (domain IS NULL OR domain = ANY($2::text[]))
      ORDER BY (kind = 'capstone') DESC, (domain IS NOT NULL) DESC, title LIMIT $3`,
    [programId, domainsFor(programId, industry, role), limit],
  )
  return rows.map((r) => r.title)
}
