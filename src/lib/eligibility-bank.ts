// Eligibility test question banks. SERVER ONLY: answers must never be sent to the browser.
// One fixed bank of 50 questions per program area (no maths, no AI). Each attempt draws 10 at random,
// spread across topics, and shuffles the options. In every bank question the FIRST option is the correct one.

import type { BankItem } from './eligibility-questions/types'
import { QUESTIONS as AI } from './eligibility-questions/ai'
import { QUESTIONS as ANALYTICS } from './eligibility-questions/analytics'
import { QUESTIONS as CLOUD_DEVOPS } from './eligibility-questions/cloud-devops'
import { QUESTIONS as DATA_SCIENCE } from './eligibility-questions/data-science'
import { QUESTIONS as FDE } from './eligibility-questions/fde'

/** 'aptitude' is kept for attempts recorded before the per-area banks existed. */
export type Track = 'aptitude' | 'ai' | 'cloud-devops' | 'fde' | 'data-science' | 'analytics'
export type Area = Exclude<Track, 'aptitude'>

export const BANKS: Record<Area, BankItem[]> = {
  ai: AI,
  'cloud-devops': CLOUD_DEVOPS,
  fde: FDE,
  'data-science': DATA_SCIENCE,
  analytics: ANALYTICS,
}
