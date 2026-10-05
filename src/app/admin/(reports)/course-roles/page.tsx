import { PageHead } from '@/components/admin/parts'
import { CourseRoles, type CRProject } from '@/components/admin/CourseRoles'
import { PROGRAMS } from '@/config/programs'
import { requireAdmin } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { roleData } from '@/lib/project-roles'
import { DOMAINS, ROLES } from '@/lib/questions'

export const metadata = { title: 'Courses & roles' }

const TRACK_OF: Record<string, string> = { ai: 'AI', fde: 'FDE', 'cloud-devops': 'Cloud & DevOps', 'data-science': 'Data', analytics: 'Data' }

/**
 * Every course with the roles and specialisations it offers projects for, and those projects: add roles, link a role
 * to a course, add projects to a course–role combination, and pause or resume projects.
 */
export default async function CourseRolesPage() {
  await requireAdmin()
  const [{ domains, links }, projects] = await Promise.all([
    roleData(),
    query<CRProject>(`SELECT id, title, description, tools, kind, domain, programs, status FROM projects ORDER BY title`),
  ])
  const programs = PROGRAMS.map((p) => ({
    id: p.id, name: p.name,
    track: p.id === 'forward-deployed-ai-engineer' ? 'FDE' : p.id.includes('data') || p.id.includes('analytics') ? 'Data' : TRACK_OF[p.interests[0]] ?? 'AI',
  })).sort((a, b) => a.track.localeCompare(b.track) || a.name.localeCompare(b.name))
  const audiences = [
    ...ROLES.map((r) => ({ id: r.id, label: r.label })),
    ...DOMAINS.filter((d) => !['other', 'student', 'non-tech'].includes(d.id)).map((d) => ({ id: `industry:${d.id}`, label: `Industry: ${d.label}` })),
  ]
  return (
    <>
      <PageHead title="Courses & roles" sub="Projects course by course and role by role. A learner sees a course’s core projects plus the projects of the roles linked to that course that match their role, typed role or industry." />
      <CourseRoles programs={programs} domains={domains} links={links} projects={projects} audiences={audiences} />
    </>
  )
}
