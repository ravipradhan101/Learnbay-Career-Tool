// Report shape shared by server and client components (no server imports here).

export type SkillLevelLabel = 'None' | 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced'

export type ReportData = {
  profileSummary: string
  currentRoleLabel: string
  recommendedPath: { title: string; subtitle: string }
  potentialGrowth: { minPercent: number; maxPercent: number; note: string }
  readiness: { score: number; band: 'Explorer' | 'Builder' | 'Practitioner'; summary: string }
  aiImpact: { summary: string; tasks: { task: string; impact: 'Automated' | 'AI-assisted' | 'Human-led' }[] }
  bestFitRoles: { title: string; fit: 'High' | 'Medium' | 'Stretch'; why: string }[]
  roadmap: {
    durationMonths: number
    weeklyHours: string
    phases: { title: string; weeks: string; focus: string; topics: string[]; milestone: string }[]
  }
  skills: { name: string; currentLevel: number; requiredLevel: number; currentLabel: SkillLevelLabel }[]
  topGaps: string[]
  tools: string[]
  projects: { title: string; description: string; skills: string[]; difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; portfolioValue: string }[]
  portfolioTips: string[]
  salary: {
    targetRoles: { role: string; minLpa: number; maxLpa: number }[]
    drivers: string[]
    note: string
  }
  recommendedProgramId: string
  whyThisTrack: string[]
  coverage: { totalGaps: number; programCovers: number; genericCovers: number; genericMisses: string[] }
  resourceIds: string[]
  caseStudies: { title: string; industry: string; summary: string; takeaway: string }[]
  nextSteps: string[]
}

export type ResumeAnalysis = {
  score: number
  summary: string
  strengths: string[]
  suggestions: string[]
  missingKeywords: string[]
  sectionFeedback: { section: string; feedback: string }[]
}
