// Learnbay's 2026 program catalogue: the single source of truth for programs, who each is for, entry rules, syllabus,
// projects and which program fits which kind of learner (the Lead–Course Map). Imported from the catalogue file with
// `node scripts/import-catalogue.mjs <file>`; fees and internal review notes are never imported.

import data from './catalogue.json'

export type CatalogueModule = { name: string; weeks: string; topics: string[]; projects: string[] }
export type CatalogueProgram = {
  code: string; name: string; family: string; tier: string; durationMonths: number | null; totalWeeks: number | null
  whoFor: string[]; notFor: string[]; entry: string; targetRoles: string[]; certificates: string
  modules: CatalogueModule[]; specialisations: { name: string; content: string; projects: string[] }[]; capstones: string[]
}
export type Persona = {
  id: string; group: string; name: string; signals: string; pains: string[]; primary: string; why: string
  upsell: string | null; alternative: string | null; avoid: string[]; probes: string[]; note: string; fdePriority: boolean
}
export type CatalogueProject = { id: string; domain: string; title: string; track: string; programs: string[]; objective: string; tools: string[]; outcome: string }

export const CATALOGUE = data as unknown as {
  version: string; generated: string
  programs: CatalogueProgram[]; personas: Persona[]; routing: { question: string; rule: string }[]
  projects: CatalogueProject[]; retired: { old: string; now: string }[]
}

/** Catalogue code → the program id used across the app (kept from the live site, so links, data and history still work). */
export const CODE_TO_ID: Record<string, string> = {
  AAP: 'applied-ai-practitioner',
  DABA: 'data-business-analytics-genai',
  'DSG-C': 'data-science-genai-program',
  'DSG-M': 'data-science-genai-master',
  'GAI-SD': 'genai-software-developers',
  'SDE-M': 'sde-genai-agentic-ai',
  'FDE-M': 'forward-deployed-ai-engineer',
  'GAI-M': 'genai-agentic-ai-master',
  'GAI-CD': 'genai-agentic-ai-cloud-devops',
  CD: 'cloud-devops-engineering',
  'CD-M': 'ai-cloud-devops-master',
  AIL: 'genai-agentic-ai-managers-leaders',
  // Back in 2026-10 (the user: "part of our system, if demand they use it"): offered to coders who aim for AI Engineer.
  AIE: 'ai-engineering-master',
  MCS: 'ms-cs-data-science-ai',
}
export const ID_TO_CODE: Record<string, string> = Object.fromEntries(Object.entries(CODE_TO_ID).map(([c, id]) => [id, c]))

export function catalogueProgram(idOrCode: string | null | undefined): CatalogueProgram | undefined {
  if (!idOrCode) return undefined
  const code = ID_TO_CODE[idOrCode] ?? idOrCode
  return CATALOGUE.programs.find((p) => p.code === code)
}

/**
 * Entry rules Learnbay set: programs for freshers (Applied AI Practitioner, Data & Business Analytics, Data Science &
 * GenAI Program) need no work experience; every other program needs 1+ year; the AI Leadership Program needs 2+ years
 * (including MBAs who joined as managers or people fast-tracked into management; there is no higher minimum). The
 * master's degree needs a bachelor's degree with 60%+.
 */
export const MIN_YEARS: Record<string, number> = {
  AAP: 0, DABA: 0, 'DSG-C': 0, 'DSG-M': 1, 'GAI-SD': 1, 'SDE-M': 1, 'FDE-M': 1, 'GAI-M': 1, 'GAI-CD': 1, CD: 1, 'CD-M': 1, AIL: 2, MCS: 0,
}
/**
 * How much coding a program expects: none (no-code), optional (taught from scratch), yes (they must code).
 * Learnbay's rule: the AI & Data Science programs teach coding from scratch, so no coding background is needed
 * (non-tech people and managers join them too). Cloud & DevOps need coding knowledge (and IT experience). The SDE
 * Master, GenAI for Software Developers and FDE are built for IT professionals and developers.
 */
export const CODING: Record<string, 'no' | 'some' | 'yes'> = {
  AAP: 'no', AIL: 'some', DABA: 'some', 'DSG-C': 'some', 'DSG-M': 'some', 'GAI-M': 'some', MCS: 'some',
  CD: 'yes', 'CD-M': 'yes', 'GAI-CD': 'yes', 'GAI-SD': 'yes', 'SDE-M': 'yes', 'FDE-M': 'yes', AIE: 'yes',
}
export const FRESHER_CODES = ['AAP', 'DABA', 'DSG-C']

export const projectById = (id: string) => CATALOGUE.projects.find((p) => p.id === id)
export const personaById = (id: string) => CATALOGUE.personas.find((p) => p.id === id)
