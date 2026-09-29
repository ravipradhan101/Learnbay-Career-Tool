// Who the learner is, from what Richa collected (experience × background, with "do you code?" as a modifier),
// and what the counsellor asks each kind of learner. See the Counsellor Conversation Playbook.

import { PROGRAMS, getProgram, programFor, type Program } from '@/config/programs'
import type { Answers, Option } from './questions'

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
  if (NONTECH_BACKGROUNDS.has(a.domain ?? '') || a.role === 'business-non-tech') return 'nontech'
  if (DOMAIN_INDUSTRIES.has(a.domain ?? '')) return 'domain'
  if (a.experience === '1-2') return 'early'
  return 'mid'
}

/** Freshers only (asked by Richa): where they are in their studies. */
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
  const s = segmentOf(a)
  if (s === 'fresher') return 'student'
  if (a.domain === 'non-tech') return 'business-non-tech'
  return undefined
}

/** Whether they code, when the role already says it. */
export function inferredProgrammer(a: Answers): string | undefined {
  if (a.role === 'software-engineer' || a.role === 'devops-cloud') return 'yes'
  return undefined
}

/**
 * The program the counsellor recommends: the track's flagship, except non-programmers (Applied AI Practitioner)
 * and senior people who lead AI work (GenAI & Agentic AI for Managers & Leaders; it expects Python and ML basics).
 */
export function programForLearner(a: Answers): Program | undefined {
  // The learner approved a program in the chat: that decision stands.
  if (a.program && PROGRAMS.some((p) => p.id === a.program)) return getProgram(a.program)
  const s = segmentOf(a)
  const fresher = s === 'fresher'
  // Cloud & DevOps: the specialisation built for their current role; beginners and non-IT start with Advanced Cloud & DevOps.
  if (a.interest === 'cloud-devops') {
    const byRole: Record<string, string> = {
      'network-admin': 'cloud-devops-network', sysadmin: 'cloud-devops-sysadmin', 'it-support': 'cloud-devops-it-support-ops',
      dba: 'cloud-devops-dba', 'qa-engineer': 'cloud-devops-qa-testers', 'devops-cloud': 'genai-agentic-ai-cloud-devops',
    }
    if (a.role && byRole[a.role]) return getProgram(byRole[a.role])
    if (fresher || a.programmer === 'no' || s === 'nontech' || s === 'domain') return getProgram('advanced-cloud-devops')
    return getProgram('ai-cloud-devops-master')
  }
  // FDE is hands-on engineering: people who don't code are better served by the Applied AI path.
  if (a.interest === 'fde') return getProgram(a.programmer === 'no' ? 'applied-ai-practitioner' : 'forward-deployed-ai-engineer')
  // AI and data. The three paths: Applied AI Practitioner (no coding), Data Science & AI (data people),
  // GenAI & Agentic AI (everyone else), plus the specialisations for freshers, developers, DevOps and leaders.
  const dataPerson = a.interest === 'data-science' || a.role === 'data-analyst' || a.probe === 'reports'
  if (fresher) return getProgram(dataPerson ? 'data-science-genai-program' : 'genai-agentic-ai-program')
  if (a.programmer === 'no') return getProgram(a.interest === 'analytics' ? 'data-business-analytics-genai' : 'applied-ai-practitioner')
  if (s === 'senior' && a.interest === 'ai' && (a.probe === 'leading' || a.probe === 'asked-to-lead')) return getProgram('genai-agentic-ai-managers-leaders')
  if (a.interest === 'analytics') return getProgram('data-business-analytics-genai')
  if (dataPerson) return getProgram('data-science-genai-master')
  if (a.role === 'software-engineer') return getProgram('genai-software-developers')
  if (a.role === 'devops-cloud') return getProgram('genai-agentic-ai-cloud-devops')
  if (a.interest === 'ai') return getProgram('genai-agentic-ai-master')
  return programFor(a.interest)
}
