import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { resolveProgramId } from '@/config/programs'
import { pickProjects } from '@/lib/projects'
import { domainLabels } from '@/lib/project-roles'
import { programForLearner } from '@/lib/segments'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

/** Four projects for the signed-in learner: their program (or ?program=), their industry, a fresh rotation each time. */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`projects:${user.id}`, 120, 3600))) return jsonError(429, 'Please try again in a minute.')
  const answers = (await getAnswers(user.id)) ?? {}
  const asked = new URL(request.url).searchParams.get('program')
  const programId = resolveProgramId(asked) ?? programForLearner(answers)?.id
  if (!programId) return jsonOk({ projects: [] })
  const [projects, labels] = await Promise.all([pickProjects(user.id, programId, answers, 4), domainLabels()])
  return jsonOk({
    programId,
    projects: projects.map((p) => ({ id: p.id, title: p.title, description: p.description, tools: p.tools.slice(0, 5), kind: p.kind, domain: p.domain, domainLabel: p.domain ? labels[p.domain] ?? null : null, objective: p.objective ?? null, outcome: p.outcome ?? null, industry: p.industry ?? null })),
  })
}
