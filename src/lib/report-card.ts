// What a report looks like inside the chat: the headline, key numbers, one small chart and the next 3 moves.
// Client-safe (no server imports): built on the server, rendered in the chat.

import { summaryFor, type ReportSummary } from './report-summary'
import type { RoadmapResult, SalaryResult, SkillGapResult, ToolResultMap } from './tool-types'
import type { ToolId } from './tools-meta'

export type MiniChart =
  | { kind: 'skills'; skills: { name: string; currentLevel: number; requiredLevel: number }[] }
  | { kind: 'ranges'; rows: { label: string; min: number; max: number; tone: 'current' | 'target' | 'muted' }[] }
  | { kind: 'phases'; phases: { title: string; weeks: string; milestone: string }[]; months: number }

export type ReportCard = { tool: ToolId; summary: ReportSummary; gauge?: number; chart: MiniChart; programId: string }
export type ToolState = { status: 'none' | 'pending' | 'generating' | 'ready' | 'failed'; card: ReportCard | null }

type Current = { minLpa: number; maxLpa: number | null } | null

export function reportCard(tool: ToolId, data: ToolResultMap[ToolId], current: Current): ReportCard {
  const summary = summaryFor(tool, data, current)
  if (tool === 'skill-gap') {
    const r = data as SkillGapResult
    return { tool, summary, gauge: r.readiness.score, programId: r.programId, chart: { kind: 'skills', skills: r.skills.map(({ name, currentLevel, requiredLevel }) => ({ name, currentLevel, requiredLevel })) } }
  }
  if (tool === 'salary') {
    const r = data as SalaryResult
    const rows: Extract<MiniChart, { kind: 'ranges' }>['rows'] = [
      ...(current ? [{ label: 'You today', min: current.minLpa, max: current.maxLpa ?? current.minLpa * 1.2, tone: 'current' as const }] : []),
      ...r.targetRoles.slice(0, 3).map((t) => ({ label: t.role, min: t.minLpa, max: t.maxLpa, tone: 'target' as const })),
    ]
    return { tool, summary, programId: r.programId, chart: { kind: 'ranges', rows } }
  }
  const r = data as RoadmapResult
  return { tool, summary, programId: r.programId, chart: { kind: 'phases', phases: r.phases.map(({ title, weeks, milestone }) => ({ title, weeks, milestone })), months: r.durationMonths } }
}
