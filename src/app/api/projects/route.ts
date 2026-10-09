import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { resolveProgramId } from '@/config/programs'
import { pickProjects } from '@/lib/projects'
import { tailorProjects } from '@/lib/project-tailor'
import { background } from '@/lib/background'
import { domainLabels } from '@/lib/project-roles'
import { programForLearner } from '@/lib/segments'
import { pathFor } from '@/lib/lead-match'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

export const maxDuration = 30
const TAILOR_WAIT_MS = 6_000

/**
 * Four projects for the signed-in learner: their program (or ?program=), their work profile and industry, a fresh
 * rotation each time, each rewritten in their own context (cached). Unusual profiles also get up to two
 * "bring your own project" ideas. Tailoring that fails or is slow falls back to the library text.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`projects:${user.id}`, 40, 3600))) return jsonError(429, 'Please try again in a minute.')
  const answers = (await getAnswers(user.id)) ?? {}
  const asked = resolveProgramId(new URL(request.url).searchParams.get('program'))
  // Only programs on their own path (or the one they chose): projects for any other program aren't theirs to see,
  // and each new one would cost an AI call.
  const mine = new Set([programForLearner(answers)?.id, answers.program, ...pathFor(answers).options.map((o) => o.programId)].filter(Boolean))
  const programId = asked && mine.has(asked) ? asked : programForLearner(answers)?.id
  if (!programId) return jsonOk({ projects: [] })
  const [projects, labels] = await Promise.all([pickProjects(user.id, programId, answers, 4), domainLabels()])
  // Tailoring waits at most a few seconds: the chat never stalls. If the AI is slower, the library text goes out now and
  // the tailored text is saved for their next look.
  const job = tailorProjects(user.id, programId, answers, projects)
  const quick = await Promise.race([job.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), TAILOR_WAIT_MS))])
  if (!quick) background('projects:tailor', () => job)
  const { tailored, ideas } = quick ?? { tailored: {} as Record<string, { objective: string; outcome: string | null }>, ideas: [] }
  return jsonOk({
    programId,
    projects: projects.map((p) => ({
      id: p.id, title: p.title, description: p.description, tools: p.tools.slice(0, 5), kind: p.kind, domain: p.domain, domainLabel: p.domain ? labels[p.domain] ?? null : null,
      objective: tailored[p.id]?.objective ?? p.objective ?? null, outcome: tailored[p.id]?.outcome ?? p.outcome ?? null, industry: p.industry ?? null, tailored: Boolean(tailored[p.id]),
    })),
    ideas: ideas.map((i) => ({ title: i.title, objective: i.objective, outcome: i.outcome, tools: i.tools, industry: i.industry })),
  })
}
