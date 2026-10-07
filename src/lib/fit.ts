// How well each Learnbay program fits a learner (out of 10), with the reasons, so the counsellor can show
// "Applied AI Practitioner 9/10, Cloud & DevOps 2/10" instead of just asserting a recommendation.
// Rules use only what the learner told us: coding, role, background, experience and what they are aiming for.

import { getProgram } from '@/config/programs'
import { PROGRAM_DETAILS } from '@/config/program-details'
import type { Answers } from './questions'
import { eligibility, programForLearner, segmentOf } from './segments'
import { pathFor } from './lead-match'
import { resolveProgramId } from '@/config/programs'

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

export function fitFor(a: Answers, requested: string): Fit {
  const programId = resolveProgramId(requested) ?? requested
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
    const leading = ['project-manager', 'product-manager'].includes(role) || ['leading', 'asked-to-lead', 'lead-ai'].includes(a.probe ?? '')
    if (leading) { score += 3; reasons.push('Made for people who lead teams, projects or AI adoption') }
    else { score -= 2; reasons.push('Aimed at managers and leaders') }
  }
  // What they are aiming for.
  if ((a.interest === 'ai' && (fam === 'applied-ai' || fam === 'ai-engineering' || fam === 'leader')) ||
      (a.interest === 'cloud-devops' && fam === 'cloud') || (a.interest === 'fde' && fam === 'fde')) score += 1

  // Entry rules decide first: a program they can't join yet never scores well, whatever else fits.
  const e = eligibility(programId, a)
  if (!e.ok) { score = Math.min(score, 2); reasons.unshift(e.reason!) }
  return { programId, name: p.name, score: Math.max(1, Math.min(10, score)), reasons: reasons.slice(0, 2) }
}

/**
 * Programs a counsellor may put next to the recommendation for this learner: the Next best and One more option from
 * their Lead–Course Map path (lib/lead-match), only those they can join now.
 */
export function alternativesFor(a: Answers): string[] {
  const best = programForLearner(a)
  return pathFor(a).options.filter((o) => !o.later && o.kind !== 'recommend' && o.programId !== best?.id).map((o) => o.programId)
}

/**
 * The learner's path as fit scores: Recommended first (always the top score), then Next best and One more option from
 * the map. `extra`: a program the learner asked about, shown with its honest score if it isn't on their path.
 */
export function fitComparison(a: Answers, extra: string[] = []): Fit[] {
  const best = programForLearner(a)
  const path = pathFor(a).options
  const rows: Fit[] = path.map((o) => ({ programId: o.programId, name: o.name, score: o.fit, reasons: [o.later ? o.later : o.why] }))
  // A program the learner approved in the chat leads, scored as their top option.
  if (best && rows[0]?.programId !== best.id) {
    const own = rows.find((r) => r.programId === best.id) ?? fitFor(a, best.id)
    rows.splice(rows.indexOf(own) >= 0 ? rows.indexOf(own) : rows.length, 1)
    rows.unshift({ ...own, score: Math.max(own.score, rows[0]?.score ?? 8) })
  }
  for (const id of extra.map((x) => resolveProgramId(x) ?? x)) {
    if (!rows.some((r) => r.programId === id)) rows.push({ ...fitFor(a, id), score: Math.min(fitFor(a, id).score, (rows[0]?.score ?? 9) - 1) })
  }
  return rows.slice(0, Math.max(3, rows.length))
}
