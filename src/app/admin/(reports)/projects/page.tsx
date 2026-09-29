import { PageHead } from '@/components/admin/parts'
import { ProjectLibrary, type AdminProject } from '@/components/admin/ProjectLibrary'
import { PROGRAMS } from '@/config/programs'
import { requireAdmin } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { PROJECT_DOMAINS } from '@/lib/project-domains'

export const metadata = { title: 'Projects' }

const TRACK_OF: Record<string, string> = { ai: 'AI', fde: 'FDE', 'cloud-devops': 'Cloud & DevOps', 'data-science': 'Data', analytics: 'Data' }

/** The project library learners see as "Projects you'll build": from the brochures, plus projects written in the same style. */
export default async function ProjectsPage() {
  await requireAdmin()
  const projects = await query<AdminProject>(
    `SELECT id, title, description, tools, kind, module, domain, programs, source, source_ref, status FROM projects ORDER BY title`,
  )
  const programs = PROGRAMS.map((p) => ({
    id: p.id, name: p.name,
    track: p.id === 'forward-deployed-ai-engineer' ? 'FDE' : p.id.includes('data') || p.id.includes('analytics') ? 'Data' : TRACK_OF[p.interests[0]] ?? 'AI',
  })).sort((a, b) => a.track.localeCompare(b.track) || a.name.localeCompare(b.name))
  return (
    <>
      <PageHead title="Projects" sub="The projects learners see in the chat. Each showing picks 4 for the learner's program and industry, keeping 1–2 they've seen and adding new ones." />
      <ProjectLibrary projects={projects} programs={programs} domains={PROJECT_DOMAINS} />
    </>
  )
}
