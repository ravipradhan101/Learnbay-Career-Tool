import type { IconName } from '../Icon'

export const STUDIO_HOME = { href: '/dashboard', label: 'AI Career Advisor', icon: 'message' as IconName }

export const CAREER_TOOLS: { href: string; label: string; icon: IconName; tool?: 'skill-gap' | 'salary' | 'roadmap' }[] = [
  { href: '/dashboard/skill-gap', label: 'Skill Gap Analysis', icon: 'chart', tool: 'skill-gap' },
  { href: '/dashboard/salary', label: 'Salary Benchmark', icon: 'rupee', tool: 'salary' },
  { href: '/dashboard/roadmap', label: 'Career Roadmap', icon: 'route', tool: 'roadmap' },
  { href: '/dashboard/eligibility', label: 'Eligibility Test', icon: 'award' },
  { href: '/dashboard/counselling', label: 'AI Counselling', icon: 'users' },
  { href: '/dashboard/masterclasses', label: 'Masterclasses', icon: 'play' },
  { href: '/dashboard/sessions', label: 'Career Strategy Sessions', icon: 'calendar' },
]
