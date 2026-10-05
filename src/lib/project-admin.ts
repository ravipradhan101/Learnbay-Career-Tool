import { PROGRAMS } from '@/config/programs'
import { DOMAINS, ROLES } from './questions'
import { cleanText } from './security'

export type ProjectInput = {
  title: string; description: string; tools: string[]; kind: 'module' | 'capstone' | 'domain'
  module: string | null; domain: string | null; programs: string[]; status: 'active' | 'paused'
}

/** Validates a project from the admin form. `domains`: the roles and specialisations in Admin → Courses & roles. */
export function parseProject(b: Record<string, unknown>, domains: Record<string, string>): { value?: ProjectInput; error?: string } {
  const title = cleanText(b.title, 120)
  if (title.length < 3) return { error: 'Give the project a title.' }
  const description = cleanText(b.description, 600)
  const tools = (Array.isArray(b.tools) ? b.tools : typeof b.tools === 'string' ? b.tools.split(',') : [])
    .map((t) => cleanText(t, 40)).filter(Boolean).slice(0, 10)
  const kind = b.kind === 'capstone' || b.kind === 'domain' ? b.kind : 'module'
  const domain = typeof b.domain === 'string' && b.domain in domains ? b.domain : null
  if (kind === 'domain' && !domain) return { error: 'Pick the domain for a domain project.' }
  const programs = (Array.isArray(b.programs) ? b.programs : []).filter((p): p is string => typeof p === 'string' && PROGRAMS.some((x) => x.id === p))
  if (!programs.length) return { error: 'Pick at least one program.' }
  const module = cleanText(b.module, 120) || null
  const status = b.status === 'paused' ? 'paused' : 'active'
  return { value: { title, description, tools, kind, module, domain: kind === 'domain' ? domain : domain, programs: [...new Set(programs)], status } }
}

/** Learner role ids, and industries as "industry:<id>": who sees a role's projects. */
export function cleanLearnerRoles(v: unknown): string[] {
  const allowed = new Set([...ROLES.map((r) => r.id), ...DOMAINS.map((d) => `industry:${d.id}`)])
  return (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && allowed.has(x)).slice(0, 30)
}
export function cleanKeywords(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []
  return [...new Set(list.map((k) => cleanText(k, 40).toLowerCase()).filter((k) => k.length >= 2))].slice(0, 40)
}

