// Result shapes for each tool (client-safe).

export type SkillLevelLabel = 'None' | 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced'

export type ProgramFit = { programId: string; whyProgram: string[] }

export type SkillGapResult = ProgramFit & {
  targetRole: string
  summary: string
  readiness: { score: number; band: 'Explorer' | 'Builder' | 'Practitioner'; summary: string }
  strengths: string[]
  skills: { name: string; currentLevel: number; requiredLevel: number; currentLabel: SkillLevelLabel }[]
  topGaps: string[]
  tools: string[]
  nextStep: string
  coverage: { totalGaps: number; programCovers: number; genericCovers: number; genericMisses: string[] }
  // Added in the detailed report (older saved reports may not have these).
  gapDetails?: { skill: string; whyItMatters: string; howToClose: string; weeks: number }[]
  marketDemand?: { summary: string; signals: string[] }
  interviewTopics?: string[]
  proofProjects?: { title: string; proves: string }[]
  thirtyDayPlan?: { week: string; focus: string }[]
  watchOuts?: string[]
}

export type SalaryResult = ProgramFit & {
  targetRole: string
  summary: string
  currentRoleMarket: { minLpa: number; maxLpa: number }
  /** No work experience yet: the report is about a first salary, not growth from a current one. */
  fresher?: boolean
  targetRoles: { role: string; minLpa: number; maxLpa: number }[]
  growth: { minPercent: number; maxPercent: number; note: string }
  drivers: string[]
  note: string
  // Added in the detailed report (older saved reports may not have these).
  companyTypes?: { type: string; minLpa: number; maxLpa: number; note: string }[]
  cityComparison?: { city: string; minLpa: number; maxLpa: number }[]
  careerLadder?: { stage: string; years: string; minLpa: number; maxLpa: number }[]
  skillPremiums?: { skill: string; impact: 'High' | 'Medium'; note: string }[]
  negotiationTips?: string[]
}

export type RoadmapResult = ProgramFit & {
  targetRole: string
  summary: string
  durationMonths: number
  weeklyHours: string
  phases: { title: string; weeks: string; focus: string; topics: string[]; milestone: string; deliverables?: string[]; practice?: string }[]
  projects: { title: string; description: string; skills: string[]; difficulty: 'Beginner' | 'Intermediate' | 'Advanced' }[]
  tools: string[]
  resourceIds: string[]
  nextSteps: string[]
  // Added in the detailed report (older saved reports may not have these).
  monthlyCheckpoints?: { month: number; goal: string }[]
  interviewPrep?: string[]
  portfolioTips?: string[]
  risks?: { risk: string; mitigation: string }[]
}

export type ToolResultMap = { 'skill-gap': SkillGapResult; salary: SalaryResult; roadmap: RoadmapResult }

export type ResumeAnalysis = {
  score: number
  summary: string
  strengths: string[]
  suggestions: string[]
  missingKeywords: string[]
  sectionFeedback: { section: string; feedback: string }[]
}
