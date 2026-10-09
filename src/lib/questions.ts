// Question and option definitions shared by the browser (onboarding, tool questions) and the server (validation).

export type Option = { id: string; label: string; hint?: string; keywords?: string[] }

// ---------- Onboarding (asked in the chat before contact details) ----------

/** Career goal (asked by Bruce). Shapes how the counsellor talks to them and what they pitch. */
export const GOALS: Option[] = [
  { id: 'switch', label: 'Switch to a better tech role' },
  { id: 'upskill', label: 'Grow faster in my current role' },
  { id: 'salary', label: 'Get a strong salary hike' },
  { id: 'start', label: 'Start my career in tech' },
  { id: 'explore', label: 'Explore where AI fits for me' },
]

/**
 * The three tracks on the start screen, in this order. The AI & Data Science track covers AI, data science, analytics
 * and no-code AI: the counsellor probes their background, coding, need and goal and routes them to the right program
 * (Learnbay's Lead–Course Map), so the start screen never asks people to choose between programs. `path` is one short
 * line on how the track is matched, deliberately not a list of programs.
 */
export const TRACKS: (Option & { interest: string; programId: string; roles: string[]; bestFor: string; path: string; icon: 'sparkles' | 'briefcase' | 'cloud' })[] = [
  {
    id: 'ai', interest: 'ai', programId: 'genai-agentic-ai-master', icon: 'sparkles', label: 'AI & Data Science track', hint: 'AI, GenAI, data science and analytics',
    bestFor: 'Freshers, non-coders, engineers, analysts, developers and managers who want AI or data in their career (coding taught from scratch)', roles: ['AI Engineer', 'Data Scientist', 'Data Analyst', 'AI-powered version of your role'],
    path: 'Your counsellor matches you to the right AI, data or no-code program for your background',
  },
  {
    id: 'fde', interest: 'fde', programId: 'forward-deployed-ai-engineer', icon: 'briefcase', label: 'FDE track', hint: 'Forward Deployed Engineering',
    bestFor: 'People who write code (1+ year in tech) and enjoy building AI solutions with clients', roles: ['Forward Deployed AI Engineer', 'AI Solutions Engineer'],
    path: 'Forward Deployed AI Engineer Master Program',
  },
  {
    id: 'cloud-devops', interest: 'cloud-devops', programId: 'cloud-devops-engineering', icon: 'cloud', label: 'Cloud & DevOps track', hint: 'AI-powered cloud and DevOps',
    bestFor: 'IT professionals (1+ year) who can code or script: sysadmin, support, network, DBA, QA, developers and DevOps', roles: ['Cloud Engineer', 'DevOps / SRE Engineer', 'MLOps Engineer'],
    path: 'A role track matched to your current IT job',
  },
]

/** The role a track aims at, so the learner is not asked again after picking the track. */
/**
 * The role a track aims at when the track alone decides it. The AI track has no single target: it depends on the
 * learner (see defaultTargetRole in lib/segments), e.g. "AI-powered Marketer" for a marketer who doesn't code.
 */
export const TRACK_TARGET: Record<string, string> = { fde: 'fde', 'cloud-devops': 'cloud-engineer' }

/** Industry or domain the learner comes from (asked by Bruce). */
/** `keywords`: what people type for that industry (typed answers only; never shown). Anything else becomes "Other" with their words. */
export const DOMAINS: Option[] = [
  { id: 'it-services', label: 'IT services / consulting', keywords: ['it services', 'it company', 'consulting', 'consultancy', 'outsourcing', 'service based', 'service company', 'infosys', 'tcs', 'wipro', 'accenture', 'cognizant', 'capgemini', 'hcl', 'tech mahindra'] },
  { id: 'product', label: 'Product / SaaS company', keywords: ['saas', 'product based', 'product company', 'software product', 'startup', 'big tech'] },
  { id: 'bfsi', label: 'Banking, finance & insurance', keywords: ['bank', 'banking', 'finance', 'financial', 'fintech', 'insurance', 'nbfc', 'payments', 'investment', 'stock', 'trading', 'accounting', 'audit', 'bfsi'] },
  { id: 'telecom', label: 'Telecom & networking', keywords: ['telecom', 'telco', 'networking', 'network'] },
  { id: 'manufacturing', label: 'Manufacturing & automotive', keywords: ['manufacturing', 'automotive', 'automobile', 'factory', 'industrial', 'mechanical', 'electronics', 'semiconductor', 'steel', 'chemical'] },
  { id: 'healthcare', label: 'Healthcare & pharma', keywords: ['healthcare', 'health', 'hospital', 'pharma', 'pharmaceutical', 'medical', 'clinical', 'life sciences', 'biotech'] },
  { id: 'retail', label: 'Retail & e-commerce', keywords: ['retail', 'ecommerce', 'e commerce', 'fmcg', 'consumer goods', 'd2c'] },
  { id: 'education', label: 'Education', keywords: ['education', 'edtech', 'teaching', 'teacher', 'school', 'college', 'university', 'training'] },
  { id: 'government', label: 'Government / PSU', keywords: ['government', 'govt', 'psu', 'public sector', 'defence', 'defense', 'railway'] },
  { id: 'non-tech', label: 'Non-tech / business role' },
  { id: 'student', label: 'Student / fresher', keywords: ['student', 'fresher', 'graduate', 'studying'] },
  { id: 'other', label: 'Other' },
]
export const DOMAIN_OTHER = 'other'

/** Probing questions the counsellor asks in the first conversation. */
export const LEARNING_SOURCES: Option[] = [
  { id: 'free', label: 'Yes, on YouTube / free content' },
  { id: 'paid', label: 'Yes, a paid course (Udemy, Coursera…)' },
  { id: 'stopped', label: 'I started, but couldn’t keep going' },
  { id: 'none', label: 'Not yet' },
]
export const DIFFICULTIES: Option[] = [
  { id: 'roadmap', label: 'No clear roadmap: what to learn first' },
  { id: 'time', label: 'Finding time next to my job' },
  { id: 'concepts', label: 'Concepts feel hard to learn alone' },
  { id: 'projects', label: 'No real projects to show' },
  { id: 'interviews', label: 'Not getting interview calls' },
  { id: 'fit', label: 'Not sure which role fits me' },
]
export const SKILL_LEVELS: Option[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

export const ROLES: Option[] = [
  { id: 'software-engineer', label: 'Software Engineer' },
  { id: 'qa-engineer', label: 'QA Engineer' },
  { id: 'data-analyst', label: 'Data Analyst / Data Scientist' },
  { id: 'devops-cloud', label: 'DevOps / Cloud Engineer' },
  { id: 'product-manager', label: 'Product Manager' },
  { id: 'business-non-tech', label: 'Business / Non-Technical' },
  // Non-tech roles, asked after "Non-tech / business role" (each has its own AI Practitioner projects)
  { id: 'data-excel', label: 'MIS / Excel / Reporting analyst' },
  { id: 'marketing', label: 'Marketing / Digital marketing' },
  { id: 'designer', label: 'Graphic / UI-UX designer' },
  { id: 'project-manager', label: 'Project / Program manager' },
  { id: 'banking-finance', label: 'Banking / Finance / Accounts' },
  { id: 'sales', label: 'Sales / Business development' },
  { id: 'hr', label: 'HR / Recruitment' },
  { id: 'operations', label: 'Operations / Supply chain' },
  { id: 'content', label: 'Content / Writing / Media' },
  { id: 'teacher', label: 'Teacher / Trainer' },
  { id: 'consultant', label: 'Business / Management consultant' },
  { id: 'student', label: 'Student / Fresher' },
  // Asked for the Cloud & DevOps track, where each has its own specialisation program
  { id: 'network-admin', label: 'Network Engineer / Admin' },
  { id: 'sysadmin', label: 'System Administrator' },
  { id: 'it-support', label: 'IT Support / Operations' },
  { id: 'dba', label: 'Database Administrator' },
]
/** Roles shown only to Cloud & DevOps learners. */
export const CLOUD_ROLES = ['network-admin', 'sysadmin', 'it-support', 'dba']
/** Non-tech roles (shown after "Non-tech / business role"). data-excel works with data: they learn Python and ML too. */
export const NONTECH_ROLES = ['data-excel', 'marketing', 'designer', 'project-manager', 'banking-finance', 'sales', 'hr', 'operations', 'content', 'teacher', 'consultant']
export const DATA_SIDE_ROLES = ['data-analyst', 'data-excel']

/** "Their role + AI": what a non-coder becomes with the AI Practitioner program (and leaders with theirs). */
export const AI_ROLE_TITLE: Record<string, string> = {
  marketing: 'AI-powered Marketer', designer: 'AI-first Designer', 'project-manager': 'AI Project Manager',
  'banking-finance': 'AI-enabled Banking & Finance Professional', sales: 'AI-powered Sales Professional', hr: 'AI-enabled HR Professional',
  operations: 'AI-driven Operations Manager', content: 'AI Content Strategist', teacher: 'AI-enabled Educator', consultant: 'AI Business Consultant',
  'business-non-tech': 'AI-enabled Business Professional', 'product-manager': 'AI Product Manager', 'data-excel': 'AI & Data Analyst',
  'data-analyst': 'AI & Data Analyst', 'qa-engineer': 'AI QA Engineer', 'software-engineer': 'AI-enabled Software Engineer',
  'devops-cloud': 'AI-powered DevOps Engineer', student: 'AI Practitioner',
}
/** The AI version of their current role ("AI-powered Marketer"), or a sensible default. */
export function aiVersionOf(a: Answers): string {
  if (a.role && AI_ROLE_TITLE[a.role]) return AI_ROLE_TITLE[a.role]
  if (a.role === ROLE_OTHER && a.roleOther) return `AI-powered ${a.roleOther}`
  return 'AI-enabled Professional'
}
export const ROLE_OTHER = 'other'

export const EXPERIENCE: Option[] = [
  { id: '0', label: 'Fresher' },
  { id: '1-2', label: '1–2 years' },
  { id: '3-5', label: '3–5 years' },
  { id: '6-9', label: '6–9 years' },
  { id: '10-15', label: '10–15 years' },
  { id: '15+', label: '15+ years' },
]

export const PROGRAMMER: Option[] = [
  { id: 'yes', label: 'Yes, I code regularly', hint: 'Programming is part of my job' },
  { id: 'some', label: 'A little', hint: 'Scripts, SQL or learning to code' },
  { id: 'no', label: 'No, I’m a non-programmer', hint: 'Business, operations, management' },
]

export const INTERESTS: Option[] = [
  { id: 'ai', label: 'AI & GenAI', hint: 'LLMs, RAG, AI agents' },
  { id: 'cloud-devops', label: 'Cloud & DevOps', hint: 'Cloud, CI/CD, AI-powered ops' },
  { id: 'fde', label: 'Forward Deployed Engineering (FDE)', hint: 'Build and ship AI for clients' },
  { id: 'data-science', label: 'Data Science', hint: 'ML, statistics, GenAI' },
  { id: 'analytics', label: 'Data & Business Analytics', hint: 'SQL, BI, GenAI for analysis' },
]

// ---------- Tool questions (asked inside the dashboard, only when missing) ----------

export const TARGET_ROLES: Record<string, Option[]> = {
  ai: [
    { id: 'ai-engineer', label: 'AI Engineer' },
    { id: 'genai-developer', label: 'GenAI / LLM Developer' },
    { id: 'ml-engineer', label: 'Machine Learning Engineer' },
    { id: 'ai-enabled-current', label: 'AI-skilled version of my current role' },
    { id: 'sde-product', label: 'Software engineer (SDE) at a product company' },
  ],
  'cloud-devops': [
    { id: 'cloud-engineer', label: 'Cloud Engineer' },
    { id: 'cloud-network-engineer', label: 'Cloud Network Engineer' },
    { id: 'sre', label: 'Cloud / Site Reliability Engineer' },
    { id: 'cloud-db-engineer', label: 'Cloud Database Engineer' },
    { id: 'cloud-ops-engineer', label: 'Cloud Operations Engineer' },
    { id: 'devops-qa', label: 'DevOps & Test Automation Engineer' },
    { id: 'devops-engineer', label: 'DevOps / SRE Engineer' },
    { id: 'mlops-engineer', label: 'MLOps / Platform Engineer' },
    { id: 'ai-enabled-current', label: 'AI-skilled version of my current role' },
  ],
  fde: [
    { id: 'fde', label: 'Forward Deployed AI Engineer' },
    { id: 'solutions-engineer', label: 'AI Solutions Engineer' },
    { id: 'ai-engineer', label: 'AI Engineer' },
  ],
  'data-science': [
    { id: 'data-scientist', label: 'Data Scientist' },
    { id: 'ml-engineer', label: 'Machine Learning Engineer' },
    { id: 'genai-developer', label: 'GenAI / LLM Developer' },
  ],
  analytics: [
    { id: 'data-analyst', label: 'Data Analyst' },
    { id: 'business-analyst', label: 'Business Analyst' },
    { id: 'analytics-engineer', label: 'Analytics Engineer' },
  ],
}
export const TARGET_NOT_SURE = 'not-sure'

export const SKILLS: Option[] = [
  { id: 'python', label: 'Python' },
  { id: 'sql', label: 'SQL' },
  { id: 'excel', label: 'Excel' },
  { id: 'api', label: 'API Development' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'cloud', label: 'Cloud (AWS/Azure)' },
  { id: 'docker', label: 'Docker / Kubernetes' },
  { id: 'ml', label: 'Machine Learning' },
  { id: 'genai', label: 'GenAI / LLMs' },
  { id: 'rag', label: 'RAG' },
  { id: 'prompting', label: 'Prompt Engineering' },
  // Added for role-specific skill lists (lib/skills.ts)
  { id: 'git', label: 'Git' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'pandas', label: 'Data wrangling (Pandas)' },
  { id: 'deep-learning', label: 'Deep Learning' },
  { id: 'agents', label: 'AI agents (LangChain, tools)' },
  { id: 'vector-db', label: 'Vector databases' },
  { id: 'linux', label: 'Linux' },
  { id: 'networking', label: 'Networking' },
  { id: 'scripting', label: 'Scripting (Bash / Python)' },
  { id: 'kubernetes', label: 'Kubernetes' },
  { id: 'cicd', label: 'CI/CD pipelines' },
  { id: 'terraform', label: 'Terraform / IaC' },
  { id: 'monitoring', label: 'Monitoring (Prometheus, Grafana)' },
  { id: 'bi', label: 'Power BI / Tableau' },
  { id: 'ai-tools', label: 'ChatGPT / Copilot at work' },
  { id: 'no-code', label: 'No-code automation' },
  { id: 'data-literacy', label: 'Reading data and dashboards' },
  { id: 'system-design', label: 'System design' },
]
export const SKILL_NONE = 'none'

// minLpa / maxLpa are in lakhs per annum; null means open-ended or not shared.
export const CTC_BANDS: (Option & { minLpa: number | null; maxLpa: number | null })[] = [
  { id: 'lt3', label: 'Below ₹3 LPA', minLpa: 0, maxLpa: 3 },
  { id: '3-5', label: '₹3 – 5 LPA', minLpa: 3, maxLpa: 5 },
  { id: '5-8', label: '₹5 – 8 LPA', minLpa: 5, maxLpa: 8 },
  { id: '8-12', label: '₹8 – 12 LPA', minLpa: 8, maxLpa: 12 },
  { id: '12-18', label: '₹12 – 18 LPA', minLpa: 12, maxLpa: 18 },
  { id: '18-25', label: '₹18 – 25 LPA', minLpa: 18, maxLpa: 25 },
  { id: '25-35', label: '₹25 – 35 LPA', minLpa: 25, maxLpa: 35 },
  { id: '35-50', label: '₹35 – 50 LPA', minLpa: 35, maxLpa: 50 },
  { id: 'gt50', label: 'Above ₹50 LPA', minLpa: 50, maxLpa: null },
  { id: 'na', label: 'Prefer not to say', minLpa: null, maxLpa: null },
]

export const CITIES: Option[] = [
  { id: 'bengaluru', label: 'Bengaluru' },
  { id: 'hyderabad', label: 'Hyderabad' },
  { id: 'pune', label: 'Pune' },
  { id: 'chennai', label: 'Chennai' },
  { id: 'delhi-ncr', label: 'Delhi NCR' },
  { id: 'mumbai', label: 'Mumbai' },
  { id: 'kolkata', label: 'Kolkata' },
  { id: 'other-india', label: 'Other city in India' },
  { id: 'remote', label: 'Remote / flexible' },
]

/** Asked only for high earners (₹50 LPA+), so the salary advice fits their employer. */
export const COMPANY_TYPES: Option[] = [
  { id: 'product', label: 'Product company / big tech' },
  { id: 'gcc', label: 'Global capability centre (GCC)' },
  { id: 'services', label: 'IT services / consulting' },
  { id: 'bfsi', label: 'Bank, fintech or insurer' },
  { id: 'startup', label: 'Startup / scale-up' },
  { id: 'other', label: 'Other' },
]

export const WEEKLY_HOURS: Option[] = [
  { id: '5-7', label: '5–7 hours', hint: 'Light pace, a busy schedule' },
  { id: '8-10', label: '8–10 hours', hint: 'Working professional (most learners)' },
  { id: '12-15', label: '12–15 hours', hint: 'Accelerated, weekdays + weekends' },
  { id: '20+', label: '20+ hours', hint: 'Full-time learner or between jobs' },
]

export const TIMELINES: Option[] = [
  { id: '3m', label: 'Within 3 months' },
  { id: '6m', label: 'Within 6 months' },
  { id: '12m', label: 'Within a year' },
  { id: 'exploring', label: 'Just exploring' },
]

// ---------- Eligibility test (asked just before the test, only if missing) ----------

export const EDU_LEVELS: Option[] = [
  { id: 'diploma', label: 'Diploma / 12th' },
  { id: 'btech', label: 'B.Tech / B.E.' },
  { id: 'bachelors', label: "Other bachelor's", hint: 'BSc, BCA, BCom, BA, BBA…' },
  { id: 'masters', label: "Master's", hint: 'M.Tech, MCA, MBA, MSc…' },
  { id: 'phd', label: 'PhD' },
]

export const MATH_COMFORT: Option[] = [
  { id: 'comfortable', label: 'Comfortable', hint: 'Percentages, averages and basic statistics are fine' },
  { id: 'rusty', label: 'A bit rusty', hint: 'I can manage with a refresher' },
  { id: 'low', label: 'Not comfortable yet', hint: 'I would need to start from basics' },
]

export const COUNTRY_CODES: { code: string; label: string; flag: string; digits: [number, number] }[] = [
  { code: '+91', label: 'India', flag: '🇮🇳', digits: [10, 10] },
  { code: '+971', label: 'UAE', flag: '🇦🇪', digits: [8, 9] },
  { code: '+1', label: 'USA / Canada', flag: '🇺🇸', digits: [10, 10] },
  { code: '+44', label: 'United Kingdom', flag: '🇬🇧', digits: [9, 10] },
  { code: '+65', label: 'Singapore', flag: '🇸🇬', digits: [8, 8] },
  { code: '+61', label: 'Australia', flag: '🇦🇺', digits: [9, 9] },
  { code: '+966', label: 'Saudi Arabia', flag: '🇸🇦', digits: [9, 9] },
  { code: '+974', label: 'Qatar', flag: '🇶🇦', digits: [8, 8] },
]

export type Answers = {
  // onboarding (Bruce)
  goal?: string
  domain?: string
  /** Their own industry, typed when it isn't in the list (domain = 'other'). */
  domainOther?: string
  /** Freshers: final year, job hunting, or working outside tech (asked by Bruce). */
  studyStage?: string
  // first conversation with the counsellor
  /** "What made you start looking at this now?" (their own reason: the only source of urgency). */
  trigger?: string
  /** The answer to their segment's question (see lib/segments). */
  probe?: string
  /** Answers to the Lead–Course Map's probe questions (config/map-questions), by question id. */
  mapAnswers?: Record<string, string>
  learning?: string
  difficulty?: string
  skillLevels?: Record<string, string>
  role?: string
  roleOther?: string
  experience?: string
  programmer?: string
  interest?: string
  /** A program the learner approved in the chat (overrides the automatic choice). */
  program?: string
  /** Asked for the salary benchmark when the current CTC is ₹50 LPA or more. */
  companyType?: string
  // tool questions
  targetRole?: string
  skills?: string[]
  ctc?: string
  city?: string
  weeklyHours?: string
  timeline?: string
  // eligibility test
  eduLevel?: string
  mathComfort?: string
  // deep-dive (asked before the skill gap or roadmap; their own words, used to tailor reports and projects)
  /** Tools or software they use most days ("RobotStudio, Process Simulate, Excel"). */
  toolsUsed?: string
  /** One problem at work they'd love AI to solve. */
  workProblem?: string
  /** The two deep-dive questions were answered or skipped (so they are asked once). */
  deepDive?: string
}

export type ToolQuestionKey = 'targetRole' | 'skills' | 'ctc' | 'city' | 'weeklyHours' | 'timeline'

export function labelOf(options: Option[], id: string | undefined): string | undefined {
  if (!id) return undefined
  return options.find((o) => o.id === id)?.label
}

export function roleLabel(a: Answers): string {
  if (a.role === ROLE_OTHER) return a.roleOther || 'Other'
  return labelOf(ROLES, a.role) ?? 'Not specified'
}
export const experienceLabel = (a: Answers) => labelOf(EXPERIENCE, a.experience) ?? 'Not specified'
export const interestLabel = (a: Answers) => labelOf(INTERESTS, a.interest) ?? 'Not specified'
export const goalLabel = (a: Answers) => labelOf(GOALS, a.goal)
export const domainLabel = (a: Answers) => (a.domain === DOMAIN_OTHER ? a.domainOther || undefined : labelOf(DOMAINS, a.domain))
/** The start-screen track for an interest: data science and analytics sit in the AI & Data Science track. */
export const trackOf = (interest: string | undefined) => TRACKS.find((t) => t.interest === (interest === 'analytics' || interest === 'data-science' ? 'ai' : interest)) ?? null
export function targetRoleOptions(a: Answers): Option[] {
  const list = TARGET_ROLES[a.interest ?? 'ai'] ?? TARGET_ROLES.ai
  // "AI-skilled version of my current role" says exactly which role ("AI-powered Marketer").
  const named = list.map((o) => (o.id === 'ai-enabled-current' ? { ...o, label: aiVersionOf(a) } : o))
  // Non-coders see their AI-version first; developer-only targets are not offered.
  if (a.programmer === 'no') return [named.find((o) => o.id === 'ai-enabled-current') ?? { id: 'ai-enabled-current', label: aiVersionOf(a) }, ...named.filter((o) => o.id !== 'ai-enabled-current' && o.id !== 'sde-product')]
  return named
}
export function targetRoleLabel(a: Answers): string {
  if (!a.targetRole) return 'Not specified'
  if (a.targetRole === TARGET_NOT_SURE) return 'Not sure yet'
  if (a.targetRole === 'ai-enabled-current') return aiVersionOf(a)
  return targetRoleOptions(a).find((o) => o.id === a.targetRole)?.label
    ?? Object.values(TARGET_ROLES).flat().find((o) => o.id === a.targetRole)?.label
    ?? 'Not specified'
}

export function isAnswered(a: Answers, key: ToolQuestionKey): boolean {
  const v = a[key]
  return Array.isArray(v) ? v.length > 0 : Boolean(v)
}

export function isValidPhone(countryCode: string, phone: string): boolean {
  const cc = COUNTRY_CODES.find((c) => c.code === countryCode)
  if (!cc || !/^\d+$/.test(phone)) return false
  if (phone.length < cc.digits[0] || phone.length > cc.digits[1]) return false
  return cc.code !== '+91' || /^[6-9]/.test(phone)
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'ME'
}
