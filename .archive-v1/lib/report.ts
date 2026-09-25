import { PROGRAMS } from '@/config/programs'
import { RESOURCES } from '@/config/resources'
import { generateJson } from './gemini'
import {
  CHALLENGES, CHALLENGE_OTHERS, CTC_BANDS, GOALS, SITUATIONS, SKILLS, SKILL_NONE, SKILL_OTHERS, WEEKLY_HOURS,
  experienceLabel, industryLabel, labelOf, roleLabel, type Answers,
} from './questions'
import type { ReportData, ResumeAnalysis, SkillLevelLabel } from './report-types'

// ---------- Prompt input ----------

export function describeAnswers(a: Answers): string {
  const skills = a.skills.includes(SKILL_NONE)
    ? 'None yet'
    : [
        ...a.skills.filter((s) => s !== SKILL_OTHERS).map((s) => labelOf(SKILLS, s)),
        a.skills.includes(SKILL_OTHERS) ? a.skillsOther || 'Others (unspecified)' : undefined,
      ].filter(Boolean).join(', ') || 'Not specified'
  const challenges = [
    ...a.challenges.filter((c) => c !== CHALLENGE_OTHERS).map((c) => labelOf(CHALLENGES, c)),
    a.challenges.includes(CHALLENGE_OTHERS) ? a.challengesOther || 'Other (unspecified)' : undefined,
  ].filter(Boolean).join('; ') || 'Not specified'
  const goals = a.goals.map((g) => {
    const o = GOALS.find((x) => x.id === g)
    return o ? `${o.label} ${o.hint ?? ''}`.trim() : g
  }).join('; ') || 'Not specified'
  const hours = WEEKLY_HOURS.find((w) => w.id === a.weeklyHours)
  return [
    `Current situation: ${labelOf(SITUATIONS, a.situation) ?? 'Not specified'}`,
    `Current role: ${roleLabel(a)}`,
    `Years of experience: ${experienceLabel(a)}`,
    `Industry / domain: ${industryLabel(a)}`,
    `Current annual CTC: ${labelOf(CTC_BANDS, a.ctc) ?? 'Not shared'}`,
    `Comfortable skills/tools: ${skills}`,
    `Goals for the next 1-2 years: ${goals}`,
    `Biggest challenges: ${challenges}`,
    `Time available for learning: ${hours ? `${hours.label} per week ${hours.hint ?? ''}` : 'Not specified'}`,
  ].join('\n')
}

const LEVELS: SkillLevelLabel[] = ['None', 'Beginner', 'Basic', 'Intermediate', 'Advanced']

// ---------- JSON schema for Gemini ----------

const str = (description: string) => ({ type: 'string', description })
const strArr = (description: string, minItems: number, maxItems: number) => ({ type: 'array', description, items: { type: 'string' }, minItems, maxItems })
const int = (description: string, minimum: number, maximum: number) => ({ type: 'integer', description, minimum, maximum })

function reportSchema() {
  return {
    type: 'object',
    properties: {
      profileSummary: str('2-3 sentences summarising where this learner is today and where they can go, addressed to them as "you".'),
      currentRoleLabel: str('Short current role label, e.g. "QA Engineer".'),
      recommendedPath: {
        type: 'object',
        properties: { title: str('Recommended target role, e.g. "AI Engineer".'), subtitle: str('Short specialisation, e.g. "GenAI & Agentic AI".') },
        required: ['title', 'subtitle'],
      },
      potentialGrowth: {
        type: 'object',
        properties: {
          minPercent: int('Lower bound of realistic salary growth % after the transition (India market).', 0, 300),
          maxPercent: int('Upper bound of realistic salary growth %.', 0, 300),
          note: str('One sentence on what drives the range. No guarantees.'),
        },
        required: ['minPercent', 'maxPercent', 'note'],
      },
      readiness: {
        type: 'object',
        properties: {
          score: int('AI career readiness 0-100 based on skills, experience and goals.', 0, 100),
          band: { type: 'string', enum: ['Explorer', 'Builder', 'Practitioner'] },
          summary: str('One sentence explaining the score.'),
        },
        required: ['score', 'band', 'summary'],
      },
      aiImpact: {
        type: 'object',
        properties: {
          summary: str('2 sentences on how AI is changing this role today. Factual and calm, no fear-mongering, no statistics.'),
          tasks: {
            type: 'array', minItems: 4, maxItems: 5,
            items: {
              type: 'object',
              properties: { task: str('A typical task in their current role.'), impact: { type: 'string', enum: ['Automated', 'AI-assisted', 'Human-led'] } },
              required: ['task', 'impact'],
            },
          },
        },
        required: ['summary', 'tasks'],
      },
      bestFitRoles: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object',
          properties: { title: str('Role title.'), fit: { type: 'string', enum: ['High', 'Medium', 'Stretch'] }, why: str('One sentence.') },
          required: ['title', 'fit', 'why'],
        },
      },
      roadmap: {
        type: 'object',
        properties: {
          durationMonths: int('Total months to be job-ready at their weekly hours.', 3, 18),
          weeklyHours: str('Weekly hours the plan assumes, e.g. "5-7 hours/week".'),
          phases: {
            type: 'array', minItems: 4, maxItems: 4,
            items: {
              type: 'object',
              properties: {
                title: str('Phase name, e.g. "Foundations".'),
                weeks: str('Week range, e.g. "1-4 Weeks".'),
                focus: str('Short focus line, e.g. "Python, ML basics, APIs".'),
                topics: strArr('3-5 topics.', 3, 5),
                milestone: str('What they can show at the end of the phase.'),
              },
              required: ['title', 'weeks', 'focus', 'topics', 'milestone'],
            },
          },
        },
        required: ['durationMonths', 'weeklyHours', 'phases'],
      },
      skills: {
        type: 'array', minItems: 8, maxItems: 10,
        description: 'Skills needed for the recommended target role, with the learner\'s current and required level.',
        items: {
          type: 'object',
          properties: {
            name: str('Skill name, e.g. "RAG & Vector DB".'),
            currentLevel: int('Current proficiency 0-100.', 0, 100),
            requiredLevel: int('Proficiency needed for the target role 0-100.', 0, 100),
            currentLabel: { type: 'string', enum: LEVELS },
          },
          required: ['name', 'currentLevel', 'requiredLevel', 'currentLabel'],
        },
      },
      topGaps: strArr('The 4 most important skill gaps, short labels.', 4, 4),
      tools: strArr('6-10 tools/frameworks to learn, e.g. "LangChain", "FastAPI".', 6, 10),
      projects: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object',
          properties: {
            title: str('Project title tied to their industry.'),
            description: str('2 sentences: what it does and why it matters in their domain.'),
            skills: strArr('Skills demonstrated.', 2, 5),
            difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
            portfolioValue: str('One sentence on why recruiters care.'),
          },
          required: ['title', 'description', 'skills', 'difficulty', 'portfolioValue'],
        },
      },
      portfolioTips: strArr('3 portfolio tips.', 3, 3),
      salary: {
        type: 'object',
        properties: {
          targetRoles: {
            type: 'array', minItems: 3, maxItems: 3,
            items: {
              type: 'object',
              properties: {
                role: str('Role title.'),
                minLpa: { type: 'number', description: 'Typical lower bound in INR lakhs per annum for their experience level in India.', minimum: 1, maximum: 200 },
                maxLpa: { type: 'number', description: 'Typical upper bound in INR lakhs per annum.', minimum: 1, maximum: 250 },
              },
              required: ['role', 'minLpa', 'maxLpa'],
            },
          },
          drivers: strArr('3 factors that move salary up for this person.', 3, 3),
          note: str('One sentence: these are indicative market ranges, not guarantees.'),
        },
        required: ['targetRoles', 'drivers', 'note'],
      },
      recommendedProgramId: { type: 'string', enum: PROGRAMS.map((p) => p.id), description: 'The single best-fit Learnbay program.' },
      whyThisTrack: strArr('4 short reasons this program fits their profile, goals and gaps.', 4, 4),
      coverage: {
        type: 'object',
        properties: {
          totalGaps: int('Number of skills in the skills list where requiredLevel > currentLevel.', 1, 10),
          programCovers: int('How many of those gaps the recommended program focus areas address.', 0, 10),
          genericCovers: int('How many of those gaps a generic, non-specialised online course typically addresses.', 0, 10),
          genericMisses: strArr('2-3 gaps a generic course usually leaves uncovered for this person.', 2, 3),
        },
        required: ['totalGaps', 'programCovers', 'genericCovers', 'genericMisses'],
      },
      resourceIds: strArr('5-8 resource ids copied exactly from the resource catalog.', 5, 8),
      caseStudies: {
        type: 'array', minItems: 2, maxItems: 2,
        items: {
          type: 'object',
          properties: {
            title: str('Use-case title, e.g. "LLM-assisted test case generation in banking".'),
            industry: str('Industry.'),
            summary: str('3 sentences describing how teams in this industry typically apply AI to this problem. Do not name real companies or cite numbers.'),
            takeaway: str('One sentence: what the learner can build or learn from it.'),
          },
          required: ['title', 'industry', 'summary', 'takeaway'],
        },
      },
      nextSteps: strArr('3 concrete next steps for this week.', 3, 3),
    },
    required: [
      'profileSummary', 'currentRoleLabel', 'recommendedPath', 'potentialGrowth', 'readiness', 'aiImpact', 'bestFitRoles',
      'roadmap', 'skills', 'topGaps', 'tools', 'projects', 'portfolioTips', 'salary', 'recommendedProgramId', 'whyThisTrack',
      'coverage', 'resourceIds', 'caseStudies', 'nextSteps',
    ],
  }
}

const SYSTEM = `You are Learnbay's AI Career Navigator, an expert career advisor for working professionals in India who want to grow with AI.
Write a personalised career report from the learner's answers.

Rules:
- Be specific to their role, experience, industry, skills, goals, challenges and weekly time. Address them as "you".
- Be honest and practical. Never promise jobs, salaries or outcomes.
- Salaries are indicative India market ranges in INR lakhs per annum (LPA) for their experience level.
- Do not invent statistics, surveys, company names, people or testimonials.
- Recommend exactly one program from the Learnbay catalog below, choosing the best fit for their background and goals.
- Pick learning resources only from the resource catalog ids below.
- Projects must relate to their industry and show skills a hiring manager for the target role screens for.
- Keep every string concise; UI space is limited.`

function catalogText(): string {
  const programs = PROGRAMS.map((p) => `- ${p.id}: ${p.name}. ${p.summary} Best for: ${p.bestFor}. Focus: ${p.focusAreas.join(', ')}.`).join('\n')
  const resources = RESOURCES.map((r) => `- ${r.id}: ${r.title} (${r.provider}) — topics: ${r.topics.join(', ')}`).join('\n')
  return `Learnbay program catalog:\n${programs}\n\nResource catalog:\n${resources}`
}

// ---------- Sanitising model output ----------

const s = (v: unknown, max = 400, fallback = ''): string => (typeof v === 'string' ? v.replace(/[<>]/g, '').trim().slice(0, max) : fallback)
const n = (v: unknown, min: number, max: number, fallback: number): number => {
  const x = typeof v === 'number' && Number.isFinite(v) ? v : fallback
  return Math.min(max, Math.max(min, x))
}
const arr = <T>(v: unknown, map: (x: unknown) => T | null, max: number): T[] =>
  (Array.isArray(v) ? v : []).map(map).filter((x): x is T => x !== null).slice(0, max)
const strList = (v: unknown, max: number, len = 160) => arr(v, (x) => (typeof x === 'string' && x.trim() ? s(x, len) : null), max)
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback)
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

export function sanitizeReport(raw: unknown): ReportData {
  const r = obj(raw)
  const growth = obj(r.potentialGrowth)
  let minP = Math.round(n(growth.minPercent, 0, 300, 30))
  let maxP = Math.round(n(growth.maxPercent, 0, 300, 60))
  if (minP > maxP) [minP, maxP] = [maxP, minP]
  const readiness = obj(r.readiness)
  const aiImpact = obj(r.aiImpact)
  const roadmap = obj(r.roadmap)
  const salary = obj(r.salary)
  const coverage = obj(r.coverage)
  const program = PROGRAMS.find((p) => p.id === r.recommendedProgramId) ?? PROGRAMS[0]
  const skills = arr(r.skills, (x) => {
    const k = obj(x)
    const name = s(k.name, 40)
    if (!name) return null
    return {
      name,
      currentLevel: Math.round(n(k.currentLevel, 0, 100, 0)),
      requiredLevel: Math.round(n(k.requiredLevel, 0, 100, 70)),
      currentLabel: oneOf(k.currentLabel, LEVELS, 'None'),
    }
  }, 10)
  const totalGaps = Math.max(1, skills.filter((k) => k.requiredLevel > k.currentLevel).length)

  return {
    profileSummary: s(r.profileSummary, 600),
    currentRoleLabel: s(r.currentRoleLabel, 60, 'Professional'),
    recommendedPath: { title: s(obj(r.recommendedPath).title, 60, 'AI Engineer'), subtitle: s(obj(r.recommendedPath).subtitle, 60) },
    potentialGrowth: { minPercent: minP, maxPercent: maxP, note: s(growth.note, 240) },
    readiness: {
      score: Math.round(n(readiness.score, 0, 100, 40)),
      band: oneOf(readiness.band, ['Explorer', 'Builder', 'Practitioner'] as const, 'Builder'),
      summary: s(readiness.summary, 240),
    },
    aiImpact: {
      summary: s(aiImpact.summary, 400),
      tasks: arr(aiImpact.tasks, (x) => {
        const t = obj(x)
        const task = s(t.task, 100)
        return task ? { task, impact: oneOf(t.impact, ['Automated', 'AI-assisted', 'Human-led'] as const, 'AI-assisted') } : null
      }, 5),
    },
    bestFitRoles: arr(r.bestFitRoles, (x) => {
      const t = obj(x)
      const title = s(t.title, 60)
      return title ? { title, fit: oneOf(t.fit, ['High', 'Medium', 'Stretch'] as const, 'Medium'), why: s(t.why, 200) } : null
    }, 3),
    roadmap: {
      durationMonths: Math.round(n(roadmap.durationMonths, 3, 18, 6)),
      weeklyHours: s(roadmap.weeklyHours, 40),
      phases: arr(roadmap.phases, (x) => {
        const p = obj(x)
        const title = s(p.title, 50)
        return title ? { title, weeks: s(p.weeks, 30), focus: s(p.focus, 90), topics: strList(p.topics, 5, 70), milestone: s(p.milestone, 200) } : null
      }, 5),
    },
    skills,
    topGaps: strList(r.topGaps, 4, 40),
    tools: strList(r.tools, 10, 40),
    projects: arr(r.projects, (x) => {
      const p = obj(x)
      const title = s(p.title, 90)
      return title
        ? {
            title,
            description: s(p.description, 400),
            skills: strList(p.skills, 5, 40),
            difficulty: oneOf(p.difficulty, ['Beginner', 'Intermediate', 'Advanced'] as const, 'Intermediate'),
            portfolioValue: s(p.portfolioValue, 240),
          }
        : null
    }, 3),
    portfolioTips: strList(r.portfolioTips, 3, 240),
    salary: {
      targetRoles: arr(salary.targetRoles, (x) => {
        const t = obj(x)
        const role = s(t.role, 60)
        if (!role) return null
        let min = Math.round(n(t.minLpa, 1, 200, 8) * 10) / 10
        let max = Math.round(n(t.maxLpa, 1, 250, 15) * 10) / 10
        if (min > max) [min, max] = [max, min]
        return { role, minLpa: min, maxLpa: max }
      }, 3),
      drivers: strList(salary.drivers, 3, 200),
      note: s(salary.note, 240),
    },
    recommendedProgramId: program.id,
    whyThisTrack: strList(r.whyThisTrack, 4, 200),
    coverage: {
      totalGaps,
      programCovers: Math.min(totalGaps, Math.round(n(coverage.programCovers, 0, 10, totalGaps))),
      genericCovers: Math.min(totalGaps, Math.round(n(coverage.genericCovers, 0, 10, Math.ceil(totalGaps / 2)))),
      genericMisses: strList(coverage.genericMisses, 3, 60),
    },
    resourceIds: [...new Set(strList(r.resourceIds, 8, 60).filter((id) => RESOURCES.some((res) => res.id === id)))],
    caseStudies: arr(r.caseStudies, (x) => {
      const c = obj(x)
      const title = s(c.title, 100)
      return title ? { title, industry: s(c.industry, 50), summary: s(c.summary, 600), takeaway: s(c.takeaway, 240) } : null
    }, 2),
    nextSteps: strList(r.nextSteps, 3, 200),
  }
}

function isUsable(r: ReportData): boolean {
  return Boolean(r.profileSummary) && r.skills.length >= 4 && r.roadmap.phases.length >= 3 && r.projects.length >= 2 && r.salary.targetRoles.length >= 1
}

export async function generateReport(answers: Answers, firstName: string): Promise<ReportData> {
  const prompt = `${catalogText()}\n\nLearner (first name: ${firstName}):\n${describeAnswers(answers)}\n\nWrite the report now.`
  const raw = await generateJson<unknown>({
    system: SYSTEM,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    jsonSchema: reportSchema(),
    temperature: 0.5,
    maxOutputTokens: 16384,
    thinkingBudget: 2048,
    timeoutMs: 120_000,
  })
  const report = sanitizeReport(raw)
  if (!isUsable(report)) throw new Error('Gemini returned an incomplete report')
  return report
}

// ---------- Current CTC helpers (from the learner's own answer, never AI) ----------

export function currentCtcRange(answers: Answers): { minLpa: number; maxLpa: number | null } | null {
  const band = CTC_BANDS.find((b) => b.id === answers.ctc)
  if (!band || band.minLpa === null) return null
  return { minLpa: band.minLpa, maxLpa: band.maxLpa }
}

// ---------- Resume analysis ----------

const RESUME_SYSTEM = `You are Learnbay's AI resume reviewer for professionals moving into AI roles in India.
Review the attached resume against the learner's target role. Be specific and constructive.
Never invent facts about the person. Do not repeat personal contact details. Keep every string concise.`

export async function analyzeResume(pdfBase64: string, context: string): Promise<ResumeAnalysis> {
  const schema = {
    type: 'object',
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100, description: 'AI readiness of this resume for the target role, 0-100.' },
      summary: { type: 'string', description: 'Two sentences on the overall impression.' },
      strengths: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 4 },
      suggestions: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 6, description: 'Concrete edits, most important first.' },
      missingKeywords: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 10 },
      sectionFeedback: {
        type: 'array', minItems: 3, maxItems: 5,
        items: { type: 'object', properties: { section: { type: 'string' }, feedback: { type: 'string' } }, required: ['section', 'feedback'] },
      },
    },
    required: ['score', 'summary', 'strengths', 'suggestions', 'missingKeywords', 'sectionFeedback'],
  }
  const raw = obj(await generateJson<unknown>({
    system: RESUME_SYSTEM,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }, { text: `Learner context:\n${context}\n\nReview this resume.` }] }],
    jsonSchema: schema,
    temperature: 0.3,
    maxOutputTokens: 8192,
    thinkingBudget: 1024,
    timeoutMs: 120_000,
  }))
  const result: ResumeAnalysis = {
    score: Math.round(n(raw.score, 0, 100, 50)),
    summary: s(raw.summary, 500),
    strengths: strList(raw.strengths, 4, 240),
    suggestions: strList(raw.suggestions, 6, 240),
    missingKeywords: strList(raw.missingKeywords, 10, 40),
    sectionFeedback: arr(raw.sectionFeedback, (x) => {
      const f = obj(x)
      const section = s(f.section, 40)
      return section ? { section, feedback: s(f.feedback, 400) } : null
    }, 5),
  }
  if (!result.summary || result.suggestions.length === 0) throw new Error('Gemini returned an incomplete resume review')
  return result
}
