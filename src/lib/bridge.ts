// "Is this transition realistic for you? Yes." The brochures' "You have / Just add" section, built for each learner:
// the strengths they already confirmed (role, industry, experience, skills rated Intermediate or Advanced), the
// skills their program adds on top, and the role that combination leads to.

import { EXPERIENCE, SKILLS, labelOf, type Answers } from './questions'
import { curriculumOf, rolesFor } from './roles'
import { programForLearner, segmentOf } from './segments'

const ROLE_STRENGTHS: Record<string, string> = {
  'software-engineer': 'Programming and software delivery',
  'qa-engineer': 'A testing mindset and quality processes',
  'data-analyst': 'Working with data, SQL and reports',
  'devops-cloud': 'Infrastructure and deployment know-how',
  'product-manager': 'Product thinking and stakeholder management',
  'business-non-tech': 'Process design, business context and stakeholder management',
  'network-admin': 'Networking fundamentals',
  sysadmin: 'System administration and Linux',
  'it-support': 'Troubleshooting and IT operations',
  dba: 'Databases and data reliability',
}
const INDUSTRY: Record<string, string> = {
  bfsi: 'banking & finance', healthcare: 'healthcare', manufacturing: 'manufacturing', retail: 'retail & e-commerce',
  telecom: 'telecom', product: 'product / SaaS', 'it-services': 'IT services', education: 'education', government: 'public sector',
}

export type Bridge = { have: string[]; add: string[]; role: string; readiness: number | null }

/** Clean module names: "Module 3 – Advanced RAG (1 month)" → "Advanced RAG". */
const clean = (m: string) => m.replace(/^(module|term)\s*\d+\s*[-–:]\s*/i, '').replace(/\s*\(.*?\)\s*/g, ' ').trim()

export function bridgeFor(a: Answers, readiness: number | null = null): Bridge {
  const have: string[] = []
  if (a.role && ROLE_STRENGTHS[a.role]) have.push(ROLE_STRENGTHS[a.role])
  if (a.domain && INDUSTRY[a.domain]) have.push(`Real ${INDUSTRY[a.domain]} domain knowledge`)
  const exp = labelOf(EXPERIENCE, a.experience)
  if (exp && exp !== 'Fresher') have.push(`${exp} of work experience`)
  if (segmentOf(a) === 'fresher') have.push('A fresh start and time to build the right skills')
  if (a.programmer === 'yes') have.push('Hands-on coding')
  const strong = Object.entries(a.skillLevels ?? {}).filter(([, lvl]) => lvl === 'intermediate' || lvl === 'advanced').map(([id]) => labelOf(SKILLS, id)).filter(Boolean) as string[]
  if (strong.length) have.push(`Already comfortable with ${strong.slice(0, 3).join(', ')}`)

  const program = programForLearner(a)
  const modules = program ? curriculumOf(program.id).modules.map(clean).filter((m) => m && !/induction|orientation|capstone|interview|optional/i.test(m)) : []
  return { have: have.slice(0, 5), add: modules.slice(0, 4), role: rolesFor(a)[0] ?? 'your next role', readiness }
}
