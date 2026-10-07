// Details of every Learnbay program, built from the 2026 catalogue (config/catalogue.json): who it is for, entry rule,
// coding, syllabus by module (with topics and projects), specialisations, capstone projects (objective, tools and what
// the learner achieves), certificates and target roles. Fees are never included; a Senior Counsellor covers them.

import { CATALOGUE, CODING, catalogueProgram, projectById, type CatalogueModule } from './catalogue'
import { PROGRAMS } from './programs'

export type ProgramProject = { id?: string; title: string; detail: string; tools: string; objective?: string; outcome?: string; domain?: string }
export type ProgramDetail = {
  name: string; url: string; category: string; audience: string; codingRequired: string; prerequisites: string
  liveHours: string | null; guidedProjects: string | null; modules: string[]; electives: string[]; domains: string[]
  projects: ProgramProject[]; certifications: string[]; roles: string[]; tools: string[]
  /** Syllabus with topics and the projects built in each module. */
  moduleDetails: CatalogueModule[]
  notFor: string[]
  durationMonths: number | null
  totalWeeks: number | null
}

/** Specialisations that are industries (the rest are roles or functions). */
const INDUSTRY = /bfsi|retail|manufactur|healthcare|pharma|supply chain|finance/i

export const PROGRAM_DETAILS: Record<string, ProgramDetail> = Object.fromEntries(PROGRAMS.map((p) => {
  const c = catalogueProgram(p.code)!
  const capstones = c.capstones.map(projectById).filter((x): x is NonNullable<typeof x> => Boolean(x))
  const moduleProjects = c.modules.reduce((n, m) => n + m.projects.length, 0) + c.specialisations.reduce((n, s) => n + s.projects.length, 0)
  const tools = [...new Set(capstones.flatMap((x) => x.tools))].slice(0, 24)
  const detail: ProgramDetail = {
    name: c.name,
    url: p.url,
    category: c.family,
    audience: c.whoFor.join('; '),
    codingRequired: CODING[p.code] ?? 'some',
    prerequisites: c.entry,
    liveHours: null,
    guidedProjects: moduleProjects ? `${moduleProjects} hands-on projects in the modules, plus ${capstones.length} capstone options across ${new Set(capstones.map((x) => x.domain)).size} industries` : capstones.length ? `${capstones.length} capstone options` : null,
    modules: c.modules.map((m) => m.name),
    electives: c.specialisations.map((s) => s.name),
    domains: c.specialisations.filter((s) => INDUSTRY.test(s.name)).map((s) => s.name),
    projects: capstones.map((x) => ({ id: x.id, title: x.title, detail: `${x.objective} ${x.outcome}`, tools: x.tools.join(', '), objective: x.objective, outcome: x.outcome, domain: x.domain })),
    certifications: [c.certificates],
    roles: c.targetRoles,
    tools,
    moduleDetails: c.modules,
    notFor: c.notFor,
    durationMonths: c.durationMonths,
    totalWeeks: c.totalWeeks,
  }
  return [p.id, detail]
}))

export const CATALOGUE_VERSION = CATALOGUE.version
