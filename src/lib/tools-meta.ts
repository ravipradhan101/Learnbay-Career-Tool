// Client-safe tool definitions (no server imports).
import type { IconName } from '@/components/Icon'
import type { ToolQuestionKey } from './questions'

export type ToolId = 'skill-gap' | 'salary' | 'roadmap'

export type ToolMeta = {
  id: ToolId
  name: string
  route: string
  icon: IconName
  tagline: string
  bullets: string[]
  questions: ToolQuestionKey[]
  generating: string[]
  /** Shown before the questions: what the learner will get, so they know why the questions are worth answering. */
  preview: { promise: string; gets: { icon: IconName; title: string; text: string }[]; minutes: number }
}

export const TOOLS: ToolMeta[] = [
  {
    id: 'skill-gap',
    name: 'Skill Gap Analysis',
    route: '/dashboard/skill-gap',
    icon: 'chart',
    tagline: 'Discover where you stand and which skills to build next.',
    bullets: ['Current strengths', 'Priority skill gaps', 'A focused next step'],
    questions: ['targetRole', 'skills'],
    generating: ['Reading your background', 'Mapping skills for your target role', 'Scoring your current level', 'Finding your priority gaps'],
    preview: {
      promise: 'Find out exactly which skills stand between you and your target role, and which to build first.',
      minutes: 2,
      gets: [
        { icon: 'target', title: 'Readiness score', text: 'A 0–100 score for your target role, and what it means.' },
        { icon: 'chart', title: 'Skill-by-skill map', text: 'Your level against what the role needs, for 8–9 core skills.' },
        { icon: 'flame', title: 'Priority gaps, explained', text: 'Why each gap matters, how to close it and how long it takes.' },
        { icon: 'route', title: 'A 30-day starter plan', text: 'Week-by-week actions, plus projects that prove each skill.' },
        { icon: 'message', title: 'Interview topics', text: 'What interviewers test for this role, so you prepare the right things.' },
      ],
    },
  },
  {
    id: 'salary',
    name: 'Salary Benchmark',
    route: '/dashboard/salary',
    icon: 'rupee',
    tagline: 'See what your target roles pay in the market today.',
    bullets: ['Market ranges for your level', 'Your potential growth', 'What moves your salary up'],
    questions: ['targetRole', 'ctc', 'city'],
    generating: ['Reading your role and experience', 'Matching market ranges for your city', 'Comparing target roles', 'Estimating your growth range'],
    preview: {
      promise: 'See what the roles you are aiming for pay at your experience level and city, and what moves the number up.',
      minutes: 2,
      gets: [
        { icon: 'trend', title: 'Your growth range', text: 'Realistic salary growth from where you are today.' },
        { icon: 'rupee', title: 'Market ranges', text: 'Your current role against 3 target roles, in ₹ LPA.' },
        { icon: 'briefcase', title: 'By company type', text: 'How GCCs, product firms, startups and services companies compare.' },
        { icon: 'grid', title: 'City and career ladder', text: 'Ranges in other cities, and how pay grows with seniority.' },
        { icon: 'sparkles', title: 'Skill premiums and negotiation', text: 'Skills that add the most, and how to negotiate your offer.' },
      ],
    },
  },
  {
    id: 'roadmap',
    name: 'Career Roadmap',
    route: '/dashboard/roadmap',
    icon: 'route',
    tagline: 'A month-by-month plan paced to the time you actually have.',
    bullets: ['Phase-by-phase plan', 'Portfolio projects', 'Tools and resources'],
    questions: ['targetRole', 'skills', 'weeklyHours', 'timeline'],
    generating: ['Reading your goals and time', 'Sequencing what to learn', 'Picking projects for your domain', 'Matching the right program'],
    preview: {
      promise: 'A month-by-month plan to your target role, paced to the hours you actually have each week.',
      minutes: 3,
      gets: [
        { icon: 'route', title: 'Phase-by-phase plan', text: 'What to learn, in which order, with a milestone for each phase.' },
        { icon: 'calendar', title: 'Monthly checkpoints', text: 'A clear goal for every month, so you always know if you are on track.' },
        { icon: 'folder', title: 'Portfolio projects', text: 'Projects tied to your background that prove your skills.' },
        { icon: 'shield', title: 'Risks and how to handle them', text: 'Where people usually stall, and what to do about it.' },
        { icon: 'book', title: 'Free resources', text: 'Hand-picked courses and docs to start this week.' },
      ],
    },
  },
]

export const TOOL_ORDER: ToolId[] = ['skill-gap', 'salary', 'roadmap']

export function getTool(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id)
}

export const QUESTION_TITLES: Record<ToolQuestionKey, { title: string; sub: string }> = {
  targetRole: { title: 'Which role are you aiming for?', sub: 'Pick the one closest to your goal.' },
  skills: { title: 'Which skills or tools are you comfortable with?', sub: 'Select all that apply.' },
  ctc: { title: 'What is your current annual CTC?', sub: 'Used only to compare your growth. Never shown on shared links.' },
  city: { title: 'Where do you work or want to work?', sub: 'Salaries differ a lot by city.' },
  weeklyHours: { title: 'How much time can you invest in learning per week?', sub: 'Your plan is paced to this.' },
  timeline: { title: 'When do you want to make your move?', sub: 'We will plan backwards from this.' },
}
