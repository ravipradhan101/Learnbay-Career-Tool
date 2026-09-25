// What makes Learnbay different. ONLY facts published on https://www.learnbay.co (checked 25 Sep 2026):
// home page "Why choose Learnbay?", "Others Vs Learnbay", the program cards and the Project Innovation Lab list.
// Edit here when the website changes; every USP section in the app reads from this file.

import type { IconName } from '@/components/Icon'

export type UspId = 'customisation' | 'domain' | 'projects' | 'mentors' | 'placement' | 'hybrid' | 'certification'

export type Usp = { id: UspId; icon: IconName; title: string; short: string; detail: string; points: string[] }

export const USPS: Record<UspId, Usp> = {
  customisation: {
    id: 'customisation',
    icon: 'target',
    title: 'Built around your background',
    short: 'Tracks designed for where you are starting from, not one course for everyone.',
    detail: 'Learnbay runs role-specific tracks, so what you learn starts from your current job. Cloud & DevOps, for example, has separate tracks for QA and software test engineers, network professionals, system administrators, database administrators and IT support.',
    points: ['Role-specific tracks for working professionals', 'A separate program for non-programmers (Applied AI Practitioner)', 'Choose 100% live online or hybrid learning'],
  },
  domain: {
    id: 'domain',
    icon: 'briefcase',
    title: 'Domain specialisation',
    short: 'Apply AI and data skills to an industry, so your experience counts instead of resetting.',
    detail: 'You specialise in a domain such as BFSI, Retail, Healthcare, Manufacturing, Technology or Consulting. Your projects then look like the work you would do in that industry.',
    points: ['Domains: BFSI, Retail, Healthcare, Manufacturing, Technology, Consulting', 'The GenAI & Agentic AI program is domain-specialised in two industries', 'Domain projects make your existing experience relevant'],
  },
  projects: {
    id: 'projects',
    icon: 'folder',
    title: 'Real projects, not simulations',
    short: 'Work on real problem statements from AI-driven companies through the AI Co-Lab.',
    detail: 'Learnbay programs are project-based: capstone projects in every program, real domain projects, and live industry problem statements from AI startups and enterprises through the AI Co-Lab experience.',
    points: ['Capstone projects in every program', 'Real AI startup projects through the AI Co-Lab', 'Startup-certified proof of work for your portfolio'],
  },
  mentors: {
    id: 'mentors',
    icon: 'users',
    title: 'Live classes with industry mentors',
    short: 'Live, interactive sessions taught by experienced industry professionals.',
    detail: 'Classes are live and interactive, led by experienced industry professionals rather than recorded videos. Student support is available 24/7.',
    points: ['Live, interactive classes', 'Experienced industry professionals as faculty', '24/7 student support'],
  },
  placement: {
    id: 'placement',
    icon: 'award',
    title: 'Placement support that prepares you',
    short: 'Mock interviews, resume build-up and interview calls when you are ready.',
    detail: 'Placement support covers mock interviews, resume build-up and interview calls. Learnbay says its learners have been hired at 350+ companies.',
    points: ['Mock interviews', 'Resume build-up', 'Interview calls', 'Hiring partners: 350+ companies'],
  },
  hybrid: {
    id: 'hybrid',
    icon: 'grid',
    title: 'Online or hybrid, your choice',
    short: 'Learn fully online, or add in-person project work at a Project Innovation Lab.',
    detail: 'Choose 100% live online classes, or hybrid learning with face-to-face project work at a Learnbay Project Innovation Lab in Bengaluru, Pune, Mumbai, Delhi NCR, Hyderabad, Chennai or Kolkata.',
    points: ['100% live online', 'Hybrid: online classes plus in-person project work', 'Labs in Bengaluru, Pune, Mumbai, Delhi NCR, Hyderabad, Chennai, Kolkata'],
  },
  certification: {
    id: 'certification',
    icon: 'shield',
    title: 'Recognised certification',
    short: 'Project certification from IBM, and Microsoft or IIT Patna certification on selected programs.',
    detail: 'Programs carry project certification from IBM; selected programs carry Microsoft certification, and the Applied AI Practitioner program is certified by IIT Patna.',
    points: ['IBM project certification', 'Microsoft certification on selected programs', 'IIT Patna certification (Applied AI Practitioner)'],
  },
}

/** Cities with a Learnbay Project Innovation Lab, matched to the learner's city answer. */
export const LAB_CITIES: Record<string, string> = {
  bengaluru: 'Bengaluru', pune: 'Pune', mumbai: 'Mumbai', 'delhi-ncr': 'Delhi NCR (Noida)', hyderabad: 'Hyderabad', chennai: 'Chennai', kolkata: 'Kolkata',
}

/** "Others vs Learnbay", as published on learnbay.co. */
export const COMPARISON: { area: string; others: string; learnbay: string; usp: UspId }[] = [
  { area: 'Training mode', others: 'Mostly recorded classes, a few live sessions', learnbay: '100% live online, or hybrid (online + classroom)', usp: 'hybrid' },
  { area: 'Real-time projects', others: 'Simulated projects', learnbay: 'Live projects, with team management practice', usp: 'projects' },
  { area: 'Faculty', others: 'Academics and trainers', learnbay: 'Experienced industry professionals', usp: 'mentors' },
  { area: 'Support', others: 'Limited support hours', learnbay: '24/7 student support', usp: 'mentors' },
  { area: 'Placement', others: 'Limited placement support', learnbay: 'Placement assistance: mock interviews, resume build-up, interview calls', usp: 'placement' },
  { area: 'Specialisation', others: 'One generic curriculum', learnbay: 'Domain specialisation and role-specific tracks', usp: 'domain' },
]

/** A learner story published on learnbay.co (kept short; attributed as published). */
export const PUBLISHED_STORY = {
  quote: 'Right from enrollment to getting a good job, they keep putting enormous efforts for each and every candidate.',
  name: 'Shravanthi A.',
  role: 'Data Scientist @ TCS',
  source: 'learnbay.co',
}
