// "Your plan with Learnbay": what a learner should focus on (from their report) and which module of their program
// teaches each focus area. Shared by the report page and the emailed PDF so both say the same thing.

import type { ToolResultMap } from './tool-types'
import type { ToolId } from './tools-meta'

const STOP = new Set(['and', 'the', 'for', 'with', 'your', 'from', 'into', 'basics', 'skills', 'skill', 'using', 'build', 'building', 'data', 'work', 'role', 'how', 'what', 'ai', 'engineering', 'term', 'module', 'fundamentals', 'foundations', 'essentials', 'advanced', 'introduction', 'intro', 'core', 'no', 'code'])
/** Words that mean the same area: a focus area naming any of them matches a module naming any other. */
const GROUPS: string[][] = [
  ['llm', 'llms', 'generative', 'genai', 'gpt'],
  ['agent', 'agents', 'agentic', 'langgraph', 'crewai', 'automation', 'automate', 'workflow', 'workflows', 'n8n', 'zapier'],
  ['rag', 'retrieval', 'vector'],
  ['ml', 'machine', 'regression', 'classification', 'xgboost', 'predictive', 'modeling', 'modelling'],
  ['sql', 'joins', 'queries', 'query', 'querying', 'database', 'databases'],
  ['python', 'pandas', 'numpy'],
  ['cloud', 'aws', 'azure'],
  ['docker', 'kubernetes', 'containers', 'container', 'containerization', 'containerisation', 'orchestration', 'helm'],
  ['bi', 'power', 'tableau', 'dashboards', 'dashboard', 'visualisation', 'visualization', 'storytelling'],
  ['prompting', 'prompt', 'prompts', 'context'],
  ['statistics', 'statistical', 'hypothesis', 'probability', 'metrics', 'eda', 'exploration', 'exploratory'],
  ['ci', 'cd', 'cicd', 'pipeline', 'pipelines', 'jenkins', 'actions'],
  ['iac', 'terraform', 'ansible'],
  ['transformer', 'transformers', 'deep', 'neural'],
  ['dsa', 'algorithms', 'structures'],
  ['design', 'hld', 'lld'],
  ['excel', 'spreadsheets', 'spreadsheet', 'pivottables'],
]
/** Plural and singular count as the same word ("agents" = "agent", "dashboards" = "dashboard"). */
const norm = (w: string) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const ALIAS: Record<string, string[]> = Object.fromEntries(GROUPS.flatMap((g) => g.map((w) => [norm(w), g.map(norm)])))
const words = (t: string) => t.toLowerCase().replace(/infrastructure as code/g, 'iac').replace(/[^a-z0-9+#. ]/g, ' ').split(/\s+/).filter((w) => w.length >= 2 && !STOP.has(w)).map(norm)

/** The program module that teaches a focus area best (by its topics), if any. */
export function moduleFor(focus: string, modules: { name: string; weeks: string; topics: string[] }[], used: Set<string> = new Set()) {
  const want = new Set(words(focus).flatMap((w) => [w, ...(ALIAS[w] ?? [])]))
  let best: { name: string; weeks: string } | null = null
  let top = 0
  for (const m of modules) {
    if (/induction|capstone|specialisation|track \(|elective|colab/i.test(m.name)) continue
    const hay = words(`${m.name} ${m.topics.join(' ')}`)
    // A match in the module's name counts twice a match in its topics.
    const score = hay.filter((w) => want.has(w)).length + words(m.name).filter((w) => want.has(w)).length
    // A module already given to an earlier focus area only wins if it is clearly the better match.
    // Ties go to the more focused module (its matches are a bigger share of what it covers).
    const adjusted = (used.has(m.name) ? score - 4 : score) + (score ? score / (hay.length + 1) : 0)
    if (adjusted > top) { top = adjusted; best = m }
  }
  return best
}


/** The focus areas a report points to, most important first. */
export function focusFor(tool: ToolId, data: ToolResultMap[ToolId]): string[] {
  if (tool === 'skill-gap') {
    const r = data as ToolResultMap['skill-gap']
    return r.gapDetails?.length ? r.gapDetails.map((g) => g.skill) : [...r.skills].sort((a, b) => (b.requiredLevel - b.currentLevel) - (a.requiredLevel - a.currentLevel)).map((x) => x.name)
  }
  if (tool === 'salary') {
    const r = data as ToolResultMap['salary']
    return r.skillPremiums?.length ? [...r.skillPremiums].sort((a, b) => (a.impact === b.impact ? 0 : a.impact === 'High' ? -1 : 1)).map((x) => x.skill) : r.drivers
  }
  return (data as ToolResultMap['roadmap']).phases.map((x) => x.title)
}

/** "weeks 8–10" for a range, "week 4" for a single week. */
export const weeksLabel = (weeks: string) => (/[–-]/.test(weeks) ? `weeks ${weeks}` : `week ${weeks}`)
