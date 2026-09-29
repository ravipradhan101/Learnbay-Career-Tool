import { PROGRAMS } from '@/config/programs'
import { PROJECT_DOMAINS } from './project-domains'
import { cleanText } from './security'

export type ProjectInput = {
  title: string; description: string; tools: string[]; kind: 'module' | 'capstone' | 'domain'
  module: string | null; domain: string | null; programs: string[]; status: 'active' | 'paused'
}

/** Validates a project from the admin form. */
export function parseProject(b: Record<string, unknown>): { value?: ProjectInput; error?: string } {
  const title = cleanText(b.title, 120)
  if (title.length < 3) return { error: 'Give the project a title.' }
  const description = cleanText(b.description, 600)
  const tools = (Array.isArray(b.tools) ? b.tools : typeof b.tools === 'string' ? b.tools.split(',') : [])
    .map((t) => cleanText(t, 40)).filter(Boolean).slice(0, 10)
  const kind = b.kind === 'capstone' || b.kind === 'domain' ? b.kind : 'module'
  const domain = typeof b.domain === 'string' && b.domain in PROJECT_DOMAINS ? b.domain : null
  if (kind === 'domain' && !domain) return { error: 'Pick the domain for a domain project.' }
  const programs = (Array.isArray(b.programs) ? b.programs : []).filter((p): p is string => typeof p === 'string' && PROGRAMS.some((x) => x.id === p))
  if (!programs.length) return { error: 'Pick at least one program.' }
  const module = cleanText(b.module, 120) || null
  const status = b.status === 'paused' ? 'paused' : 'active'
  return { value: { title, description, tools, kind, module, domain: kind === 'domain' ? domain : domain, programs: [...new Set(programs)], status } }
}
