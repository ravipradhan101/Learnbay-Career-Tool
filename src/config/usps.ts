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
    detail: 'Learnbay has separate programs for freshers, non-coders, analysts, developers, cloud and IT people, and managers, and each program has tracks so what you learn starts from your current job. Cloud & DevOps Engineering, for example, has role tracks for IT Support & ITOps, System Admin, Network, DBA, QA & Test, and General IT & Developers; the Applied AI Practitioner Program has function tracks for Marketing, Sales, HR, and Finance & Operations.',
    points: ['Separate programs for coders, non-coders and managers', 'Role and function tracks inside each program', 'Choose 100% live online or hybrid learning'],
  },
  domain: {
    id: 'domain',
    icon: 'briefcase',
    title: 'Domain specialisation',
    short: 'Apply AI and data skills to an industry, so your experience counts instead of resetting.',
    detail: 'The master programs let you specialise in an industry such as BFSI, Retail & E-commerce, Manufacturing & Supply Chain, or Healthcare & Pharma, and the analytics program has domain tracks for marketing, HR, finance, supply chain and product. Your projects then look like the work you would do in that industry.',
    points: ['Industry specialisations: BFSI, Retail, Manufacturing & Supply Chain, Healthcare & Pharma', 'The GenAI & Agentic AI Master adds two specialisations of your choice', 'Projects from 23 industries make your experience count'],
  },
  projects: {
    id: 'projects',
    icon: 'folder',
    title: 'Real projects, not simulations',
    short: 'Work on real problem statements from AI-driven companies through the AI Co-Lab.',
    // "Bring your own project" confirmed by the Learnbay team (9 Oct 2026).
    detail: 'Learnbay programs are project-based: projects in the modules, capstones drawn from real industry scenarios, and, in most programs, a real startup problem through the AI CoLab with a project certificate. Bring your own project: if you have a project from your own work or idea, you can bring it and the mentors guide you on it too.',
    points: ['Projects in every module, plus capstones', 'Bring your own project: mentors guide you on it', 'Real startup problems through the AI CoLab', 'AI CoLab project certificates for your portfolio'],
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
    short: 'IBM certification on most programs, plus Microsoft, IIT Patna and AI CoLab certificates on many.',
    detail: 'Most programs carry an IBM certificate (Cloud & DevOps Engineering carries a Microsoft Azure certification track instead). Depending on the program you also get a Microsoft (Azure) certificate, an IIT Patna certificate (Vishlesan I-Hub Foundation) and AI CoLab project certificates; the Master’s in CS is a degree via Woolf University. Your program lists exactly which.',
    points: ['IBM certificate on most programs', 'Microsoft, IIT Patna or AI CoLab on many programs', 'Your program shows its exact certificates'],
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
