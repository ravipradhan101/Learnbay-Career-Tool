// One summary per report, used by the web page, the email and the PDF so all three say the same thing.
// People skim: each report leads with one headline number, 3-4 key numbers, a chart and 3 actions.
// Client-safe (no server imports).

import { getProgram } from '@/config/programs'
import type { RoadmapResult, SalaryResult, SkillGapResult, ToolResultMap } from './tool-types'
import type { ToolId } from './tools-meta'

export type Kpi = { label: string; value: string; sub?: string; tone?: 'primary' | 'success' | 'accent' | 'warning' }
export type Action = { title: string; detail?: string; href?: string; cta?: string }
export type ReportSummary = { headline: { value: string; label: string; note: string }; kpis: Kpi[]; actions: Action[] }

export const lpaText = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(1)}L`
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim()
/** Keeps text scannable: ends at a sentence or clause when it has to be shortened, never mid-word. */
const shorten = (s: string, max = 170) => {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '))
  return stop > max * 0.5 ? `${cut.slice(0, stop)}.` : `${cut.replace(/\s+\S*$/, '')}…`
}

/** Parses "Weeks 3-8" / "Week 5" / "Month 2" into a week range. */
export function weekRange(text: string, fallback: [number, number]): [number, number] {
  const m = text.match(/(week|month)s?\s*(\d+)\s*(?:[-–to]+\s*(\d+))?/i)
  if (!m) return fallback
  const scale = /month/i.test(m[1]) ? 4.3 : 1
  const a = Math.round((Number(m[2]) - (scale > 1 ? 1 : 0)) * scale) + (scale > 1 ? 1 : 0)
  const b = Math.round(Number(m[3] ?? m[2]) * scale)
  return a > 0 && b >= a ? [a, b] : fallback
}

export function skillGapSummary(r: SkillGapResult): ReportSummary {
  const gaps = r.skills.filter((s) => s.requiredLevel > s.currentLevel)
  const weeks = r.gapDetails?.length ? Math.max(...r.gapDetails.map((g) => g.weeks)) : null
  const topGap = r.gapDetails?.[0]
  return {
    headline: { value: `${r.readiness.score}`, label: `/100 ready for ${r.targetRole}`, note: firstSentence(r.readiness.summary || r.summary) },
    kpis: [
      { label: 'Readiness', value: `${r.readiness.score}/100`, sub: r.readiness.band, tone: 'primary' },
      { label: 'Skills to build', value: `${gaps.length}`, sub: `of ${r.skills.length} core skills`, tone: 'accent' },
      ...(weeks ? [{ label: 'To close top gaps', value: `~${weeks} wks`, sub: 'at your weekly pace', tone: 'warning' as const }] : []),
      { label: 'Strengths', value: `${r.strengths.length}`, sub: 'transferable skills', tone: 'success' },
    ],
    actions: [
      { title: 'This week', detail: shorten(r.nextStep || 'Pick your first gap and spend one hour on it.') },
      topGap
        ? { title: `Start with ${topGap.skill}`, detail: shorten(topGap.howToClose), href: '/dashboard/roadmap', cta: 'See it in your roadmap' }
        : { title: `Start with ${r.topGaps[0] ?? 'your first gap'}`, href: '/dashboard/roadmap', cta: 'Plan it' },
      { title: 'Get your gaps reviewed by a mentor', detail: 'A free 1:1 to confirm what to learn first, and what to skip.', href: '/dashboard/sessions', cta: 'Book free 1:1' },
    ],
  }
}

export function salarySummary(r: SalaryResult, current: { minLpa: number; maxLpa: number | null } | null): ReportSummary {
  const top = [...r.targetRoles].sort((a, b) => b.maxLpa - a.maxLpa)[0]
  const bestEmployer = r.companyTypes?.length ? [...r.companyTypes].sort((a, b) => b.maxLpa - a.maxLpa)[0] : null
  const premium = r.skillPremiums?.find((k) => k.impact === 'High') ?? r.skillPremiums?.[0]
  return {
    headline: { value: `+${r.growth.minPercent}–${r.growth.maxPercent}%`, label: 'potential salary growth', note: firstSentence(r.growth.note || r.summary) },
    kpis: ([
      { label: current ? 'You today' : 'Your role today', value: current ? (current.maxLpa ? `${lpaText(current.minLpa)}–${lpaText(current.maxLpa)}` : `${lpaText(current.minLpa)}+`) : `${lpaText(r.currentRoleMarket.minLpa)}–${lpaText(r.currentRoleMarket.maxLpa)}`, sub: 'per year', tone: 'warning' },
      ...(top ? [{ label: top.role, value: `${lpaText(top.minLpa)}–${lpaText(top.maxLpa)}`, sub: 'market range', tone: 'success' as const }] : []),
      ...(bestEmployer ? [{ label: 'Pays most', value: bestEmployer.type, sub: `up to ${lpaText(bestEmployer.maxLpa)}`, tone: 'primary' as const }] : []),
      ...(premium ? [{ label: 'Biggest pay lever', value: premium.skill, sub: `${premium.impact} impact`, tone: 'accent' as const }] : []),
    ] as Kpi[]).slice(0, 4),
    actions: [
      premium
        ? { title: `Add ${premium.skill}`, detail: shorten(premium.note), href: '/dashboard/roadmap', cta: 'Plan it' }
        : { title: 'Close your top skill gap', href: '/dashboard/skill-gap', cta: 'See my gaps' },
      ...(r.negotiationTips?.[0] ? [{ title: 'Before your next offer', detail: shorten(r.negotiationTips[0]) }] : []),
      { title: 'Plan your switch with a mentor', detail: 'A free 1:1 on which role, which companies, and a realistic number for you.', href: '/dashboard/sessions', cta: 'Book free 1:1' },
    ],
  }
}

export function roadmapSummary(r: RoadmapResult): ReportSummary {
  return {
    headline: { value: `${r.durationMonths}`, label: `months to ${r.targetRole}`, note: firstSentence(r.summary) },
    kpis: [
      { label: 'Time to job-ready', value: `${r.durationMonths} months`, tone: 'primary' },
      { label: 'Weekly effort', value: r.weeklyHours.replace(/\/\s*week/i, '').trim() || r.weeklyHours, sub: 'per week', tone: 'accent' },
      { label: 'Phases', value: `${r.phases.length}`, sub: 'each ends with a milestone', tone: 'success' },
      { label: 'Portfolio projects', value: `${r.projects.length}`, sub: 'to show employers', tone: 'warning' },
    ],
    actions: [
      ...r.nextSteps.slice(0, 2).map((s, i) => ({ title: i === 0 ? 'Today' : 'This week', detail: shorten(s) })),
      { title: 'Stay on track with a mentor', detail: 'A free 1:1 to pressure-test this plan against your job and schedule.', href: '/dashboard/sessions', cta: 'Book free 1:1' },
    ],
  }
}

export function summaryFor(tool: ToolId, data: ToolResultMap[ToolId], current: { minLpa: number; maxLpa: number | null } | null = null): ReportSummary {
  if (tool === 'skill-gap') return skillGapSummary(data as SkillGapResult)
  if (tool === 'salary') return salarySummary(data as SalaryResult, current)
  return roadmapSummary(data as RoadmapResult)
}

export const programOf = (programId: string) => getProgram(programId)
