import { PROGRAM_DETAILS } from '@/config/program-details'
import type { CatalogueModule } from '@/config/catalogue'
import type { RoadmapResult } from './tool-types'

/**
 * A roadmap's four phases come from the program's own syllabus: its modules, in order, with their real weeks, grouped
 * into four parts of similar length. The AI only tailors what each phase means for the learner; it never decides
 * which modules there are (so the GenAI & Agentic AI Master always opens with Python, and nothing is dropped).
 * Every module in a phase is named in its title and contributes its own key topics, so none is hidden behind another
 * (e.g. "Foundation for GenAI" with its ML, DL and NLP topics, next to the Claude module).
 */
export type CurriculumPhase = { title: string; weeks: string; modules: string[]; topics: string[] }

const range = (w: string): [number, number] | null => {
  const m = /(\d+)\s*(?:[–—-]\s*(\d+))?/.exec(w ?? '')
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null
}
const weeksOf = (w: string) => { const r = range(w)!; return r[0] === r[1] ? `week ${r[0]}` : `weeks ${r[0]}-${r[1]}` }

/**
 * A module's short name: "Personal AI productivity: Claude, Copilot & connectors" → "Personal AI productivity", and
 * "Claude, Claude Code & MCP for managers" → "Claude, Claude Code & MCP" (but "Foundation for GenAI" stays whole).
 */
const short = (name: string) => {
  const head = name.split(/[:(]/)[0].trim()
  const cut = head.replace(/\s+for\s+(managers?|leaders|managers? & leaders|genai)$/i, '').trim()
  return cut.split(/\s+/).length >= 2 ? cut : head
}
const isInduction = (name: string) => /^induction/i.test(name)
/** The brochure's capstone module lists sample capstones from other industries: the learner's capstones are their own. */
const isCapstone = (name: string) => /^capstone/i.test(name)
const TOPICS_PER_PHASE = 10

export function curriculumPhases(programId: string | undefined, count = 4): CurriculumPhase[] | null {
  const mods = (programId ? PROGRAM_DETAILS[programId]?.moduleDetails : undefined)?.filter((m): m is CatalogueModule & { weeks: string } => Boolean(m.name && range(m.weeks)))
  if (!mods || mods.length < 2) return null
  const total = range(mods[mods.length - 1].weeks)![1]
  const n = Math.min(count, mods.length)
  // Cut after the module whose end week is closest to each quarter of the program (every phase gets at least one).
  const groups: (typeof mods)[] = []
  let start = 0
  for (let k = 1; k <= n; k++) {
    const left = n - k
    if (k === n) { groups.push(mods.slice(start)); break }
    const target = (total * k) / n
    let best = start
    for (let i = start; i < mods.length - left; i++) {
      if (Math.abs(range(mods[i].weeks)![1] - target) <= Math.abs(range(mods[best].weeks)![1] - target)) best = i
    }
    groups.push(mods.slice(start, best + 1))
    start = best + 1
  }
  return groups.map((g) => {
    const from = range(g[0].weeks)![0]
    const to = range(g[g.length - 1].weeks)![1]
    // Induction is a few days: it never names a phase (unless it is all there is).
    const named = g.filter((m) => !isInduction(m.name))
    const shown = named.length ? named : g
    const names = shown.map((m) => (isCapstone(m.name) ? 'Capstone' : short(m.name)))
    const title = names.length <= 2 || names.join(' + ').length <= 90 ? names.join(' + ') : `${names.slice(0, 2).join(' + ')} + ${names.length - 2} more`
    // Topics: an even share from every module in the phase (each module's first topics are its core).
    const per = Math.max(2, Math.ceil(TOPICS_PER_PHASE / shown.length))
    const lists = shown.map((m) => (isCapstone(m.name) ? ['Capstone project on your own work and industry'] : m.topics.length ? m.topics : [short(m.name)]).slice(0, per))
    const topics: string[] = []
    for (let i = 0; topics.length < TOPICS_PER_PHASE && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && topics.length < TOPICS_PER_PHASE) topics.push(l[i])
    return { title, weeks: from === to ? `Week ${from}` : `Weeks ${from}-${to}`, modules: g.map((m) => `${m.name} (${weeksOf(m.weeks)})`), topics }
  })
}

/** The skeleton as plain lines for the prompt. */
export function curriculumBrief(phases: CurriculumPhase[]): string {
  return phases.map((p, i) => `Phase ${i + 1} (${p.weeks}): ${p.modules.join('; ')}`).join('\n')
}

/**
 * A saved roadmap shown with the program's current syllabus: phase names, weeks, topics and modules always come from
 * the catalogue (so older roadmaps pick up syllabus fixes); the learner's own focus, milestones and deliverables stay.
 */
/** A phase module's full topic list ("Foundation for GenAI (weeks 8-10)" → its ML, DL, NLP... topics). */
export function moduleTopics(programId: string, label: string): string[] {
  const name = label.replace(/ \((weeks?) [^)]*\)$/, '')
  if (isCapstone(name)) return ['Capstone project on your own work and industry']
  return PROGRAM_DETAILS[programId]?.moduleDetails.find((m) => m.name === name)?.topics ?? []
}

export function withCurriculum(r: RoadmapResult): RoadmapResult {
  const skeleton = curriculumPhases(r.programId)
  if (!skeleton || skeleton.length !== r.phases.length) return r
  return { ...r, phases: r.phases.map((p, i) => ({ ...p, title: skeleton[i].title, weeks: skeleton[i].weeks, topics: skeleton[i].topics, modules: skeleton[i].modules })) }
}
