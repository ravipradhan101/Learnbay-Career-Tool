// How well each Learnbay program fits a learner (out of 10), with the reasons, so the counsellor can show
// "Applied AI Practitioner 9/10, Cloud & DevOps 2/10" instead of just asserting a recommendation.
// Rules use only what the learner told us: coding, role, background, experience and what they are aiming for.

import { getProgram } from '@/config/programs'
import { PROGRAM_DETAILS } from '@/config/program-details'
import type { Answers } from './questions'
import { programForLearner, segmentOf } from './segments'

type Family = 'applied-ai' | 'cloud' | 'data' | 'ai-engineering' | 'fde' | 'leader'

export function programFamily(id: string): Family {
  if (id === 'applied-ai-practitioner') return 'applied-ai'
  if (id === 'genai-agentic-ai-managers-leaders') return 'leader'
  if (id === 'forward-deployed-ai-engineer') return 'fde'
  if (id.includes('data') || id.includes('analytics')) return 'data'
  if (id.includes('cloud')) return 'cloud'
  return 'ai-engineering'
}

const CLOUD_ROLES = new Set(['devops-cloud', 'network-admin', 'sysadmin', 'it-support', 'dba', 'qa-engineer'])

export type Fit = { programId: string; name: string; score: number; reasons: string[] }

export function fitFor(a: Answers, programId: string): Fit {
  const p = getProgram(programId)
  const d = PROGRAM_DETAILS[programId]
  const fam = programFamily(programId)
  const seg = segmentOf(a)
  const nonCoder = a.programmer === 'no'
  const coder = a.programmer === 'yes'
  let score = 5
  const reasons: string[] = []

  // Coding: the biggest single factor.
  const coding = d?.codingRequired ?? 'unknown'
  if (coding === 'yes' && nonCoder) { score -= 3; reasons.push('Needs coding, which you haven’t done yet') }
  else if (coding === 'some' && nonCoder) { score -= 1; reasons.push('Expects some coding basics') }
  else if (coding === 'no' && nonCoder) { score += 1; reasons.push('No coding needed') }
  else if (coding === 'yes' && coder) { score += 1; reasons.push('Builds on your coding') }

  // Background: does the program start from where they are?
  const role = a.role ?? ''
  if (fam === 'applied-ai') {
    if (seg === 'nontech' || seg === 'domain' || nonCoder) { score += 3; reasons.push('Built for professionals who apply AI in their work, like you') }
    else if (coder) { score -= 2; reasons.push('You already code: an engineering program takes you further') }
  } else if (fam === 'cloud') {
    if (CLOUD_ROLES.has(role)) { score += 3; reasons.push('Builds directly on your IT / infrastructure work') }
    else if (seg === 'nontech' || seg === 'domain' || nonCoder) { score -= 3; reasons.push('Made for IT, network and support roles, far from your background') }
    else if (role === 'software-engineer') score += 1
    if (seg === 'fresher') { score -= 1; reasons.push('Cloud programs expect some IT experience') }
  } else if (fam === 'data') {
    if (role === 'data-analyst' || a.probe === 'reports' || a.interest === 'data-science' || a.interest === 'analytics') { score += 3; reasons.push('Builds on your work with data') }
    else if (seg === 'domain') score += 1
  } else if (fam === 'ai-engineering' || fam === 'fde') {
    if (role === 'software-engineer') { score += 3; reasons.push('Builds on your development work') }
    else if (role === 'devops-cloud' || role === 'qa-engineer' || role === 'data-analyst') score += 1
    else if (seg === 'nontech' || nonCoder) { score -= 3; reasons.push('An engineering path, far from your current work') }
    if (fam === 'fde' && seg === 'fresher') { score -= 1; reasons.push('Made for working professionals') }
  } else if (fam === 'leader') {
    if (seg === 'senior') { score += 3; reasons.push('Made for people leading AI work') }
    else { score -= 2; reasons.push('Aimed at managers and leaders') }
  }
  // What they are aiming for.
  if ((a.interest === 'ai' && (fam === 'applied-ai' || fam === 'ai-engineering' || fam === 'leader')) ||
      (a.interest === 'cloud-devops' && fam === 'cloud') || (a.interest === 'fde' && fam === 'fde')) score += 1

  return { programId, name: p.name, score: Math.max(1, Math.min(10, score)), reasons: reasons.slice(0, 2) }
}

/** The recommended program first (it is always the top score), then the program each track would lead to for them. */
export function fitComparison(a: Answers, extra: string[] = []): Fit[] {
  const best = programForLearner(a)
  const ids = [...new Set([
    best?.id,
    ...(['ai', 'fde', 'cloud-devops'] as const).map((interest) => programForLearner({ ...a, interest, program: undefined })?.id),
    ...extra,
  ].filter((x): x is string => Boolean(x)))]
  const fits = ids.map((id) => fitFor(a, id)).sort((x, y) => y.score - x.score)
  if (best) {
    const top = fits.find((f) => f.programId === best.id)!
    const others = fits.filter((f) => f.programId !== best.id)
    top.score = Math.min(10, Math.max(top.score, (others[0]?.score ?? 0) + 1))
    return [top, ...others].slice(0, 3)
  }
  return fits.slice(0, 3)
}
