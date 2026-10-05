import { query } from '@/lib/db'
import { adminGuard, body, isUuid } from '@/lib/email/admin'
import { HIRING_CATEGORIES, forgetHiringCache } from '@/lib/hiring'
import { cleanText, jsonError, jsonOk } from '@/lib/security'

type Ctx = { params: Promise<{ id: string }> }

/** Rename, recategorise, mark as alumni or featured (only the fields sent change). */
export async function PATCH(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Company not found.')
  const b = await body(request)
  const name = b.name === undefined ? null : cleanText(b.name, 80)
  if (name !== null && name.length < 2) return jsonError(400, 'Give the company a name.')
  const category = b.category === undefined ? null : HIRING_CATEGORIES.find((c) => c === b.category) ?? null
  if (b.category !== undefined && !category) return jsonError(400, 'Pick a category from the list.')
  const alumni = typeof b.alumni === 'boolean' ? b.alumni : null
  const featured = typeof b.featured === 'boolean' ? b.featured : null
  try {
    const r = await query(
      `UPDATE hiring_companies SET name = COALESCE($2, name), category = COALESCE($3, category), alumni = COALESCE($4, alumni),
              featured = COALESCE($5, featured), updated_at = now() WHERE id = $1 RETURNING id`,
      [id, name, category, alumni, featured],
    )
    forgetHiringCache()
    return r.length ? jsonOk() : jsonError(404, 'Company not found.')
  } catch {
    return jsonError(409, 'Another company already has this name.')
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Company not found.')
  await query(`DELETE FROM hiring_companies WHERE id = $1`, [id])
  forgetHiringCache()
  return jsonOk()
}
