import { query } from './db'
import type { Answers } from './questions'

// Roles and specialisations for the project library, kept in the database and edited in Admin → Courses & roles:
// which learners each role is for (role ids, "industry:<id>", or words in a typed role) and which courses offer it.

export type RoleDomain = { key: string; label: string; kind: 'industry' | 'role'; learner_roles: string[]; keywords: string[] }
export type CourseRole = { program_id: string; domain_key: string; core: boolean }

let cache: { at: number; domains: RoleDomain[]; links: CourseRole[] } | null = null

export async function roleData(): Promise<{ domains: RoleDomain[]; links: CourseRole[] }> {
  if (cache && Date.now() - cache.at < 60_000) return cache
  const [domains, links] = await Promise.all([
    query<RoleDomain>(`SELECT key, label, kind, learner_roles, keywords FROM project_domains ORDER BY label`),
    query<CourseRole>(`SELECT program_id, domain_key, core FROM course_roles`),
  ])
  cache = { at: Date.now(), domains, links }
  return cache
}
export function forgetRoleCache() { cache = null }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The specialisations this learner sees projects from in a course, most specific first: their role (or a typed role
 * that matches a role's words), then their industry, then the course's core specialisations.
 */
export async function domainKeysFor(programId: string, a: Pick<Answers, 'role' | 'roleOther' | 'domain' | 'domainOther'>): Promise<string[]> {
  const { domains, links } = await roleData()
  const offered = new Set(links.filter((l) => l.program_id === programId).map((l) => l.domain_key))
  const typed = `${a.roleOther ?? ''} ${a.domainOther ?? ''}`.toLowerCase().trim()
  const matches = (d: RoleDomain) =>
    (a.role !== undefined && d.learner_roles.includes(a.role)) ||
    (a.domain !== undefined && d.learner_roles.includes(`industry:${a.domain}`)) ||
    (typed !== '' && d.keywords.some((k) => new RegExp(`(^|\\W)${escape(k.toLowerCase())}(\\W|$)`).test(typed)))
  const roles = domains.filter((d) => d.kind === 'role' && offered.has(d.key) && matches(d)).map((d) => d.key)
  const industries = domains.filter((d) => d.kind === 'industry' && offered.has(d.key) && matches(d)).map((d) => d.key)
  const core = links.filter((l) => l.program_id === programId && l.core).map((l) => l.domain_key)
  return [...new Set([...roles, ...industries, ...core])]
}

/** Display names for the tags on project cards. */
export async function domainLabels(): Promise<Record<string, string>> {
  const { domains } = await roleData()
  return Object.fromEntries(domains.map((d) => [d.key, d.label]))
}
