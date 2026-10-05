import { query } from '@/lib/db'
import { adminGuard, body } from '@/lib/email/admin'
import { HIRING_CATEGORIES, forgetHiringCache, parseCompanyLines } from '@/lib/hiring'
import { jsonError, jsonOk } from '@/lib/security'

/** Adds companies in bulk (one per line: "Name | Category"); names already in the list are skipped. */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const b = await body(request)
  const fallback = HIRING_CATEGORIES.find((c) => c === b.category) ?? 'Product & startups'
  const rows = parseCompanyLines(b.lines, fallback)
  if (!rows.length) return jsonError(400, 'Add at least one company (one per line).')
  const alumni = b.alumni === true
  let added = 0
  for (const r of rows) {
    const res = await query(`INSERT INTO hiring_companies (name, category, alumni) VALUES ($1, $2, $3) ON CONFLICT (lower(name)) DO NOTHING RETURNING id`, [r.name, r.category, alumni])
    added += res.length
  }
  forgetHiringCache()
  return jsonOk({ added, skipped: rows.length - added })
}
