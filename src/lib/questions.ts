// Question and option definitions shared by the browser (onboarding, tool questions) and the server (validation).

export type Option = { id: string; label: string; hint?: string }

// ---------- Onboarding (asked before contact details) ----------

export const ROLES: Option[] = [
  { id: 'software-engineer', label: 'Software Engineer' },
  { id: 'qa-engineer', label: 'QA Engineer' },
  { id: 'data-analyst', label: 'Data Analyst / Data Scientist' },
  { id: 'devops-cloud', label: 'DevOps / Cloud Engineer' },
  { id: 'product-manager', label: 'Product Manager' },
  { id: 'business-non-tech', label: 'Business / Non-Technical' },
  { id: 'student', label: 'Student / Fresher' },
]
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
  ],
  'cloud-devops': [
    { id: 'cloud-engineer', label: 'Cloud Engineer' },
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
  { id: 'excel', label: 'Excel / BI tools' },
  { id: 'api', label: 'API Development' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'cloud', label: 'Cloud (AWS/Azure)' },
  { id: 'docker', label: 'Docker / Kubernetes' },
  { id: 'ml', label: 'Machine Learning' },
  { id: 'genai', label: 'GenAI / LLMs' },
  { id: 'rag', label: 'RAG' },
  { id: 'prompting', label: 'Prompt Engineering' },
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

export const WEEKLY_HOURS: Option[] = [
  { id: '2-4', label: '2–4 hours', hint: 'Part time' },
  { id: '5-7', label: '5–7 hours', hint: 'Working professional' },
  { id: '8-12', label: '8–12 hours', hint: 'Dedicated learner' },
  { id: '12+', label: '12+ hours', hint: 'Fast track' },
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
  // onboarding
  role?: string
  roleOther?: string
  experience?: string
  programmer?: string
  interest?: string
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
export function targetRoleOptions(a: Answers): Option[] {
  return TARGET_ROLES[a.interest ?? 'ai'] ?? TARGET_ROLES.ai
}
export function targetRoleLabel(a: Answers): string {
  if (!a.targetRole) return 'Not specified'
  if (a.targetRole === TARGET_NOT_SURE) return 'Not sure yet'
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
