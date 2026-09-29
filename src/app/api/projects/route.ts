import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { PROGRAMS } from '@/config/programs'
import { pickProjects } from '@/lib/projects'
import { programForLearner } from '@/lib/segments'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

/** Four projects for the signed-in learner: their program (or ?program=), their industry, a fresh rotation each time. */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`projects:${user.id}`, 120, 3600))) return jsonError(429, 'Please try again in a minute.')
  const answers = (await getAnswers(user.id)) ?? {}
  const asked = new URL(request.url).searchParams.get('program')
  const programId = asked && PROGRAMS.some((p) => p.id === asked) ? asked : programForLearner(answers)?.id
  if (!programId) return jsonOk({ projects: [] })
  const projects = await pickProjects(user.id, programId, answers.domain, 4, answers.role)
  return jsonOk({
    programId,
    projects: projects.map((p) => ({ id: p.id, title: p.title, description: p.description, tools: p.tools.slice(0, 5), kind: p.kind, domain: p.domain })),
  })
}
