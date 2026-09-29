// The tools and concepts each kind of target role needs (ids from SKILLS in lib/questions). The skill-gap question
// shows only the list for the learner's program, and they rate each one in a single card.

import { SKILLS, type Answers, type Option } from './questions'
import { programForLearner } from './segments'

export type SkillFamily = 'ai-engineering' | 'data' | 'applied-ai' | 'cloud' | 'leader'

const FAMILY_SKILLS: Record<SkillFamily, string[]> = {
  'ai-engineering': ['python', 'sql', 'api', 'git', 'ml', 'genai', 'prompting', 'rag', 'agents', 'vector-db', 'cloud', 'docker'],
  data: ['python', 'sql', 'excel', 'bi', 'statistics', 'pandas', 'ml', 'deep-learning', 'genai', 'prompting'],
  'applied-ai': ['ai-tools', 'prompting', 'excel', 'bi', 'data-literacy', 'no-code', 'genai'],
  cloud: ['linux', 'networking', 'scripting', 'cloud', 'docker', 'kubernetes', 'cicd', 'terraform', 'monitoring', 'git', 'genai'],
  leader: ['ai-tools', 'prompting', 'genai', 'agents', 'data-literacy', 'python', 'ml', 'system-design'],
}

/** Which family of skills fits the program the counsellor recommends for this learner. */
export function skillFamily(a: Answers): SkillFamily {
  const p = programForLearner(a)
  const id = p?.id ?? ''
  if (id === 'applied-ai-practitioner') return 'applied-ai'
  if (id === 'genai-agentic-ai-managers-leaders') return 'leader'
  if (id.startsWith('data-') || id.includes('data-science') || id.includes('analytics')) return 'data'
  if (id.includes('cloud') || a.interest === 'cloud-devops') return 'cloud'
  return 'ai-engineering'
}

/** The skills to rate for this learner, in the order that matters for their target roles. */
export function skillsFor(a: Answers): Option[] {
  return FAMILY_SKILLS[skillFamily(a)].map((id) => SKILLS.find((s) => s.id === id)).filter((s): s is Option => Boolean(s))
}
