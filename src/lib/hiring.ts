import { query } from './db'
import { cleanText } from './security'

// Companies shown to learners (Admin → Companies). `alumni`: Learnbay publishes that its alumni work there (the only
// ones the counsellor may describe that way); the rest are well-known companies hiring for these roles in India.

export type HiringCompany = { id: string; name: string; category: string; alumni: boolean; featured: boolean }

export const HIRING_CATEGORIES = [
  'Big Tech', 'Global capability centre', 'Consulting & IT services', 'Product & startups', 'Banking & finance',
  'Analytics & AI', 'Telecom & engineering', 'Healthcare & pharma', 'Retail & consumer',
] as const
export const HIRING_CLAIM = 'Learnbay alumni work at 350+ companies'

let cache: { at: number; rows: HiringCompany[] } | null = null

/** All companies, well-known (featured) first; cached for five minutes. */
export async function hiringCompanies(): Promise<HiringCompany[]> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.rows
  const rows = await query<HiringCompany>(`SELECT id, name, category, alumni, featured FROM hiring_companies ORDER BY featured DESC, alumni DESC, lower(name)`)
  cache = { at: Date.now(), rows }
  return rows
}
export function forgetHiringCache() { cache = null }

/** "Name | Category" (or "Name, Category") per line, as pasted in Admin. Unknown categories fall back to the default. */
export function parseCompanyLines(text: unknown, fallback: string): { name: string; category: string }[] {
  if (typeof text !== 'string') return []
  const cats = HIRING_CATEGORIES as readonly string[]
  return text.split(/\r?\n/).map((line) => {
    const [rawName, rawCat] = line.split(/\s*[|\t]\s*/)
    const name = cleanText(rawName, 80)
    const cat = cleanText(rawCat, 40)
    const category = cats.find((c) => c.toLowerCase() === cat?.toLowerCase()) ?? fallback
    return { name, category }
  }).filter((c) => c.name.length >= 2).slice(0, 500)
}
