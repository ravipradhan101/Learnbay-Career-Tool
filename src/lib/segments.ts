// Who the learner is, from what Lumi collected (experience × background, with "do you code?" as a modifier),
// and what the counsellor asks each kind of learner. See the Counsellor Conversation Playbook.

import { PROGRAMS, getProgram, programFor, type Program } from '@/config/programs'
import { DATA_SIDE_ROLES, NONTECH_ROLES, TRACK_TARGET, type Answers, type Option } from './questions'

export type Segment = 'fresher' | 'early' | 'mid' | 'domain' | 'nontech' | 'senior'

export const SEGMENT_LABEL: Record<Segment, string> = {
  fresher: 'Fresher / student',
  early: 'Early career (1–2 years), tech role',
  mid: 'Mid career (3–9 years), tech role',
  domain: 'Domain professional (BFSI, healthcare, retail, telecom, manufacturing)',
  nontech: 'Non-tech / business / public sector',
  senior: 'Senior professional or leader (10+ years)',
}

const DOMAIN_INDUSTRIES = new Set(['bfsi', 'healthcare', 'manufacturing', 'retail', 'telecom'])
const NONTECH_BACKGROUNDS = new Set(['non-tech', 'government', 'education'])

export function segmentOf(a: Answers): Segment {
  if (a.experience === '0' || a.domain === 'student' || a.role === 'student') return 'fresher'
  if (a.experience === '10-15' || a.experience === '15+') return 'senior'
  if (NONTECH_BACKGROUNDS.has(a.domain ?? '') || a.role === 'business-non-tech' || NONTECH_ROLES.includes(a.role ?? '')) return 'nontech'
  if (DOMAIN_INDUSTRIES.has(a.domain ?? '')) return 'domain'
  if (a.experience === '1-2') return 'early'
  return 'mid'
}

/** Freshers only (asked by Lumi): where they are in their studies. */
export const STUDY_STAGES: Option[] = [
  { id: 'final-year', label: 'Final year student' },
  { id: 'job-hunting', label: 'Graduated, looking for my first job' },
  { id: 'non-tech-job', label: 'Graduated, working outside tech' },
]

/** "What made you start looking at this now?": the learner's own reason, the only source of urgency. */
export const TRIGGERS_FRESHER: Option[] = [
  { id: 'job-hunt', label: 'My job hunt is starting' },
  { id: 'no-calls', label: 'Applying, but not getting calls' },
  { id: 'peers', label: 'Friends are moving ahead' },
  { id: 'exploring', label: 'Just exploring' },
]
export const TRIGGERS: Option[] = [
  { id: 'appraisal', label: 'Appraisal or salary is due' },
  { id: 'job-worry', label: 'Worried about my job' },
  { id: 'ai-at-work', label: 'AI is coming into my work' },
  { id: 'stuck', label: 'Feeling stuck in my role' },
  { id: 'exploring', label: 'Just exploring' },
]
export const ALL_TRIGGERS: Option[] = [...TRIGGERS_FRESHER, ...TRIGGERS.filter((t) => t.id !== 'exploring')]
export const triggersFor = (s: Segment) => (s === 'fresher' ? TRIGGERS_FRESHER : TRIGGERS)

/** One question per segment that finds the specific pain. */
export const PROBES: Record<Segment, { question: string; options: Option[] }> = {
  fresher: {
    question: 'What have you built so far?',
    options: [
      { id: 'college-project', label: 'A college project' },
      { id: 'internship', label: 'An internship' },
      { id: 'nothing-yet', label: 'Nothing yet' },
    ],
  },
  early: {
    question: 'In your job today, do you mostly build new things or maintain existing ones?',
    options: [
      { id: 'build', label: 'Mostly build new things' },
      { id: 'maintain', label: 'Mostly maintain or support' },
      { id: 'test', label: 'Mostly testing' },
    ],
  },
  mid: {
    question: 'How is AI showing up in your team?',
    options: [
      { id: 'using', label: 'We already use it' },
      { id: 'asked', label: 'We’re being asked to' },
      { id: 'not-yet', label: 'Not yet' },
    ],
  },
  domain: {
    question: 'Which part of your work is repetitive or data-heavy?',
    options: [
      { id: 'reports', label: 'Reports and analysis' },
      { id: 'customers', label: 'Customer data and queries' },
      { id: 'operations', label: 'Operations and processes' },
      { id: 'not-much', label: 'Not much yet' },
    ],
  },
  nontech: {
    question: 'Do you want to build AI tools, or use and lead with them?',
    options: [
      { id: 'build-tools', label: 'Build AI tools' },
      { id: 'use-ai', label: 'Use AI in my work' },
      { id: 'lead-ai', label: 'Lead AI projects' },
      { id: 'not-sure', label: 'Not sure yet' },
    ],
  },
  senior: {
    question: 'Are you leading AI work already, or being asked to?',
    options: [
      { id: 'leading', label: 'Already leading AI work' },
      { id: 'asked-to-lead', label: 'Being asked to' },
      { id: 'hands-on', label: 'I want to stay hands-on' },
      { id: 'not-yet', label: 'Not yet' },
    ],
  },
}
export const ALL_PROBES: Option[] = Object.values(PROBES).flatMap((p) => p.options)

/** The hardest-part options that make sense for each segment (ids from DIFFICULTIES). */
export const DIFFICULTIES_FOR: Record<Segment, string[]> = {
  fresher: ['projects', 'interviews', 'roadmap', 'fit'],
  early: ['roadmap', 'projects', 'interviews', 'time'],
  mid: ['time', 'roadmap', 'projects', 'interviews'],
  domain: ['fit', 'concepts', 'roadmap', 'time'],
  nontech: ['fit', 'concepts', 'roadmap', 'time'],
  senior: ['time', 'concepts', 'fit', 'projects'],
}

/** The role, when the background already says it (so the counsellor doesn't ask). */
export function inferredRole(a: Answers): string | undefined {
  // Non-tech people are asked which role (marketer, designer, banker…): each has its own projects and target.
  return segmentOf(a) === 'fresher' ? 'student' : undefined
}

/** Whether they code, when the role already says it. */
export function inferredProgrammer(a: Answers): string | undefined {
  if (a.role === 'software-engineer' || a.role === 'devops-cloud') return 'yes'
  return undefined
}

const THREE_PLUS = new Set(['3-5', '6-9', '10-15', '15+'])
/** Works with data today (analysts, MIS / Excel / reporting) or wants a data career. */
export const dataSide = (a: Answers) => DATA_SIDE_ROLES.includes(a.role ?? '') || a.probe === 'reports' || a.interest === 'data-science'

/**
 * The program the counsellor recommends (rules agreed with Learnbay):
 * - Cloud & DevOps: the specialisation for their current role; beginners and non-IT start with Advanced Cloud & DevOps.
 * - FDE: hands-on engineering; people who don't code go to the Applied AI Practitioner Program.
 * - Freshers: Data Science & GenAI Program (data people) or the GenAI & Agentic AI Program.
 * - Non-coders: on the data side (analytics, MIS, Excel) GenAI & Agentic AI, which teaches Python, ML, DL and NLP first
 *   (Master for 3+ years, the Program under 3); everyone else (designer, marketer, banker, PM…) the Applied AI
 *   Practitioner Program with projects for their role.
 * - Leaders who lead or will lead AI work: GenAI & Agentic AI for Managers & Leaders.
 * - Data people who code: Advanced Data Science & GenAI Master with 3+ years and regular coding, else the Program.
 * - Developers by goal: AI Engineering Master (AI Engineer), SDE Master (product-company SDE), else GenAI & Agentic AI
 *   for Software Developers.
 * - Everyone else on the AI track: GenAI & Agentic AI Master for 3+ years, the Program under 3.
 */
export function programForLearner(a: Answers): Program | undefined {
  // The learner approved a program in the chat: that decision stands.
  if (a.program && PROGRAMS.some((p) => p.id === a.program)) return getProgram(a.program)
  const s = segmentOf(a)
  const fresher = s === 'fresher'
  const seasoned = THREE_PLUS.has(a.experience ?? '')
  if (a.interest === 'cloud-devops') {
    const byRole: Record<string, string> = {
      'network-admin': 'cloud-devops-network', sysadmin: 'cloud-devops-sysadmin', 'it-support': 'cloud-devops-it-support-ops',
      dba: 'cloud-devops-dba', 'qa-engineer': 'cloud-devops-qa-testers', 'devops-cloud': 'genai-agentic-ai-cloud-devops',
    }
    if (a.role && byRole[a.role]) return getProgram(byRole[a.role])
    if (fresher || a.programmer === 'no' || s === 'nontech' || s === 'domain') return getProgram('advanced-cloud-devops')
    return getProgram('ai-cloud-devops-master')
  }
  if (a.interest === 'fde') return getProgram(a.programmer === 'no' ? 'applied-ai-practitioner' : 'forward-deployed-ai-engineer')
  const data = dataSide(a)
  if (fresher) return getProgram(data ? 'data-science-genai-program' : 'genai-agentic-ai-program')
  if (a.interest === 'analytics') return getProgram('data-business-analytics-genai')
  if (a.programmer === 'no') {
    if (data) return getProgram(seasoned ? 'genai-agentic-ai-master' : 'genai-agentic-ai-program')
    return getProgram('applied-ai-practitioner')
  }
  if (s === 'senior' && (a.probe === 'leading' || a.probe === 'asked-to-lead')) return getProgram('genai-agentic-ai-managers-leaders')
  if (data) return getProgram(seasoned && a.programmer === 'yes' ? 'data-science-genai-master' : 'data-science-genai-program')
  if (a.role === 'software-engineer') {
    if (a.targetRole === 'ai-engineer') return getProgram('ai-engineering-master')
    if (a.targetRole === 'sde-product') return getProgram('sde-genai-agentic-ai')
    return getProgram('genai-software-developers')
  }
  if (a.role === 'devops-cloud') return getProgram('genai-agentic-ai-cloud-devops')
  if (a.interest === 'ai' || !a.interest) return getProgram(seasoned ? 'genai-agentic-ai-master' : 'genai-agentic-ai-program')
  return programFor(a.interest)
}

/** The target role when the learner hasn't picked one: what their recommended program leads to for them. */
const CLOUD_TARGET: Record<string, string> = {
  'network-admin': 'cloud-network-engineer', sysadmin: 'sre', dba: 'cloud-db-engineer', 'it-support': 'cloud-ops-engineer',
  'qa-engineer': 'devops-qa', 'devops-cloud': 'mlops-engineer', 'software-engineer': 'devops-engineer',
}

export function defaultTargetRole(a: Answers): string | undefined {
  // Cloud & DevOps: the role their specialisation leads to (a network admin becomes a Cloud Network Engineer…).
  if (a.interest === 'cloud-devops') return CLOUD_TARGET[a.role ?? ''] ?? TRACK_TARGET['cloud-devops']
  const id = programForLearner({ ...a, targetRole: undefined })?.id
  if (!id) return undefined
  if (id === 'applied-ai-practitioner' || id === 'genai-agentic-ai-managers-leaders' || id === 'data-business-analytics-genai') return 'ai-enabled-current'
  if (id === 'forward-deployed-ai-engineer') return 'fde'
  if (id.startsWith('data-science') || id === 'ms-cs-data-science-ai') return 'data-scientist'
  if (a.programmer === 'no') return 'ai-enabled-current'
  if (id === 'ai-engineering-master') return 'ai-engineer'
  if (id === 'genai-agentic-ai-cloud-devops') return 'mlops-engineer'
  if (a.role === 'qa-engineer') return 'ai-enabled-current'
  if (id === 'sde-genai-agentic-ai') return 'sde-product'
  return 'genai-developer'
}
