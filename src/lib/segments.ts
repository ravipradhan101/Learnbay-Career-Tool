// Who the learner is, from what Woody collected (experience × background, with "do you code?" as a modifier),
// and what the counsellor asks each kind of learner. See the Counsellor Conversation Playbook.

import { PROGRAMS, getProgram, programFor, resolveProgramId, type Program } from '@/config/programs'
import { DATA_SIDE_ROLES, NONTECH_ROLES, TRACK_TARGET, type Answers, type Option } from './questions'
import { eligibility, routeFor } from './lead-match'

// Who they are and which programs fit is calculated in lib/lead-match (the Lead–Course Map); re-exported here.
export { codes, eligibility, inferredProgrammer, pathFor, routeFor, scorePersonas, yearsOf, type LeadPath, type PathOption, type Route } from './lead-match'

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

/** Freshers only (asked by Woody): where they are in their studies. */
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
  { id: 'career-break', label: 'Coming back after a career break' },
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

/** Works with data today (analysts, MIS / Excel / reporting) or wants a data career. */
export const dataSide = (a: Answers) => DATA_SIDE_ROLES.includes(a.role ?? '') || a.probe === 'reports' || a.interest === 'data-science'

// ---------- Who they are (the Lead–Course Map's lead types) and which program fits ----------

/**
 * The program the counsellor recommends. A program the learner approved in the chat stands, as long as they can join it.
 */
export function programForLearner(a: Answers): Program | undefined {
  const approved = resolveProgramId(a.program)
  if (approved && eligibility(approved, a).ok) return getProgram(approved)
  return PROGRAMS.find((p) => p.code === routeFor(a).code) ?? programFor(a.interest)
}

/** The lead type (from the Lead–Course Map) this learner matches. */
export function personaOf(a: Answers): string {
  return routeFor(a).persona
}

/** The target role when the learner hasn't picked one: what their recommended program leads to for them. */
const CLOUD_TARGET: Record<string, string> = {
  'network-admin': 'cloud-network-engineer', sysadmin: 'sre', dba: 'cloud-db-engineer', 'it-support': 'cloud-ops-engineer',
  'qa-engineer': 'devops-qa', 'devops-cloud': 'mlops-engineer', 'software-engineer': 'devops-engineer',
}

export function defaultTargetRole(a: Answers): string | undefined {
  const code = programForLearner({ ...a, targetRole: undefined })?.code
  if (!code) return undefined
  if (code === 'CD' || code === 'CD-M' || code === 'GAI-CD') return CLOUD_TARGET[a.role ?? ''] ?? TRACK_TARGET['cloud-devops']
  // Students and freshers have no current role to AI-enable: their goal is a first job in the field they chose.
  if (code === 'AAP' && a.experience === '0' && (a.interest === 'data-science' || a.interest === 'analytics')) return 'data-analyst'
  if (code === 'AAP' || code === 'AIL') return 'ai-enabled-current'
  if (code === 'DABA') return a.interest === 'analytics' ? 'data-analyst' : 'ai-enabled-current'
  if (code === 'FDE-M') return 'fde'
  if (code === 'DSG-C' || code === 'DSG-M' || code === 'MCS') return 'data-scientist'
  if (code === 'SDE-M') return 'sde-product'
  if (a.role === 'qa-engineer') return 'ai-enabled-current'
  return 'genai-developer'
}
