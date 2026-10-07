// Roles a learner can aim for after their program, by seniority, and what the counsellor says about pay.
// Role names are common job titles, not promises; salary is always framed as an indicative market range.

import { PROGRAM_DETAILS } from '@/config/program-details'
import { resolveProgramId } from '@/config/programs'
import { TRACK_PROJECTS } from '@/config/stories'
import { aiVersionOf, type Answers } from './questions'
import { programForLearner, segmentOf } from './segments'

type Level = 'junior' | 'mid' | 'senior'

const ROLE_PATHS: Record<string, Record<Level, string[]>> = {
  'genai-agentic-ai-master': { junior: ['GenAI Developer', 'AI Engineer', 'LLM Application Developer'], mid: ['AI Engineer', 'Agentic AI Engineer', 'LLMOps Engineer'], senior: ['AI Architect', 'AI Engineering Lead', 'Agentic AI Lead'] },
  'genai-software-developers': { junior: ['GenAI Developer', 'AI-enabled Software Engineer', 'LLM Application Developer'], mid: ['AI Engineer', 'GenAI Software Engineer', 'Agentic AI Engineer'], senior: ['AI Solutions Architect', 'Staff AI Engineer', 'AI Engineering Manager'] },
  'sde-genai-agentic-ai': { junior: ['Software Engineer (AI)', 'SDE with GenAI skills', 'GenAI Developer'], mid: ['Senior Software Engineer (AI)', 'AI Engineer', 'Backend Engineer, AI products'], senior: ['Staff Engineer (AI)', 'AI Solutions Architect', 'Engineering Manager, AI'] },
  'forward-deployed-ai-engineer': { junior: ['Forward Deployed AI Engineer', 'AI Solutions Engineer', 'AI Implementation Engineer'], mid: ['Forward Deployed AI Engineer', 'AI Solutions Engineer', 'Customer AI Engineer'], senior: ['AI Solutions Architect', 'Lead Forward Deployed Engineer', 'AI Delivery Lead'] },
  'genai-agentic-ai-cloud-devops': { junior: ['MLOps Engineer', 'AI-ready DevOps Engineer', 'Cloud Engineer'], mid: ['MLOps / LLMOps Engineer', 'AIOps Engineer', 'Platform Engineer (AI)'], senior: ['AI Platform Architect', 'Head of Platform Engineering', 'Cloud & AI Architect'] },
  'genai-agentic-ai-managers-leaders': { junior: ['AI Product / Program Manager', 'AI-enabled Business Manager', 'AI Transformation Lead'], mid: ['AI Transformation Lead', 'AI Product / Program Manager', 'AI-enabled Engineering Manager'], senior: ['Head of AI Adoption', 'AI Transformation Leader', 'AI-enabled Business Head'] },
  'applied-ai-practitioner': { junior: ['AI Automation Specialist', 'AI-enabled Business Analyst', 'AI Operations Associate'], mid: ['AI Automation Specialist', 'AI Product Analyst', 'AI-enabled Operations / Marketing Lead'], senior: ['AI Transformation Lead', 'AI Product Owner', 'Head of AI Adoption'] },
  'data-science-genai-master': { junior: ['Data Scientist', 'ML Engineer (junior)', 'Data Analyst → Data Scientist'], mid: ['Data Scientist', 'ML Engineer', 'GenAI Data Scientist'], senior: ['Lead Data Scientist', 'ML Architect', 'Analytics & AI Manager'] },
  'data-science-genai-program': { junior: ['Data Analyst', 'Junior Data Scientist', 'ML Associate'], mid: ['Data Scientist', 'ML Engineer', 'GenAI Analyst'], senior: ['Lead Data Scientist', 'Analytics Manager', 'AI & Data Lead'] },
  'ms-cs-data-science-ai': { junior: ['Data Scientist', 'ML Engineer', 'Data Analyst'], mid: ['Senior Data Scientist', 'ML Engineer', 'Senior Data Analyst'], senior: ['Lead Data Scientist', 'Principal ML Engineer', 'Head of Data Science'] },
  'data-business-analytics-genai': { junior: ['Data Analyst', 'Business Analyst', 'BI Analyst'], mid: ['Senior Business Analyst', 'BI Engineer', 'AI Product Analyst'], senior: ['Analytics Manager', 'AI Product Manager', 'Head of Business Intelligence'] },
  'cloud-devops-engineering': { junior: ['Cloud Engineer', 'DevOps Engineer', 'Cloud Ops / SRE (junior)'], mid: ['DevOps Engineer', 'Cloud Network Engineer', 'Cloud DBA / DBRE'], senior: ['Cloud Architect', 'DevOps Lead', 'Platform Engineering Lead'] },
  'ai-cloud-devops-master': { junior: ['Cloud Engineer', 'DevOps Engineer', 'SRE'], mid: ['Platform Engineer', 'DevSecOps Engineer', 'SRE'], senior: ['Cloud Architect', 'AI Infrastructure Engineer', 'Platform Engineering Lead'] },
}

function levelOf(a: Answers): Level {
  if (segmentOf(a) === 'fresher' || a.experience === '1-2') return 'junior'
  if (a.experience === '10-15' || a.experience === '15+') return 'senior'
  return 'mid'
}

/** Roles this learner can aim for after their recommended program. */
export function rolesFor(a: Answers): string[] {
  const id = programForLearner(a)?.id ?? 'genai-agentic-ai-master'
  const roles = (ROLE_PATHS[id] ?? ROLE_PATHS['genai-agentic-ai-master'])[levelOf(a)]
  // People who don't code grow their own career with AI first ("AI-powered Marketer"), then the program's roles.
  if (id === 'applied-ai-practitioner' || id === 'genai-agentic-ai-managers-leaders' || a.programmer === 'no') return [...new Set([aiVersionOf(a), ...roles])].slice(0, 3)
  return roles
}

/** How the counsellor frames pay (never a promise): a step of at least 20% below ₹50 LPA; career value above it. */
export function payNote(a: Answers): string | null {
  if (!a.ctc || a.ctc === 'na') return 'Your Salary Benchmark shows how these roles compare with your pay today.'
  if (a.ctc === 'gt50') return 'At your level the gain is scope and leadership more than a fixed hike; your Senior Counsellor will map where pay can realistically move.'
  return 'We aim for roles paying at least 20% more than your current band. Your Salary Benchmark shows the indicative ranges.'
}

/** A program's syllabus, projects, certificates and roles (2026 catalogue). */
export function curriculumOf(programId: string) {
  const d = PROGRAM_DETAILS[resolveProgramId(programId) ?? '']
  return {
    liveHours: null as string | null,
    projectsCount: d?.guidedProjects ?? null,
    modules: d?.modules ?? [],
    moduleDetails: d?.moduleDetails ?? [],
    electives: d?.electives ?? [],
    domains: d?.domains ?? [],
    capstones: d?.projects?.map((p) => p.title) ?? [],
    projects: d?.projects ?? [],
    tools: d?.tools ?? [],
    certifications: d?.certifications ?? [],
    audience: d?.audience ?? '',
    codingRequired: d?.codingRequired ?? 'unknown',
    prerequisites: d?.prerequisites ?? '',
    notFor: d?.notFor ?? [],
    roles: d?.roles ?? [],
    durationMonths: d?.durationMonths ?? null,
    totalWeeks: d?.totalWeeks ?? null,
  }
}

/** The projects card for a program: its own published projects, or the track's examples. */
export function projectsFor(programId: string | undefined, interest: string): { title: string; tools: string }[] {
  const d = programId ? PROGRAM_DETAILS[resolveProgramId(programId) ?? ''] : undefined
  if (d?.projects?.length) return d.projects.slice(0, 4).map((p) => ({ title: p.title, tools: p.tools || p.detail.slice(0, 90) }))
  return TRACK_PROJECTS[interest] ?? TRACK_PROJECTS.ai
}
