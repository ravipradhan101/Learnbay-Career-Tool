import { queryOne } from '@/lib/db'
import { restoreSet, validSnapshot } from '@/lib/eligibility-sets'
import { adminGuard, isUuid } from '@/lib/email/admin'
import { jsonError, jsonOk, readJson } from '@/lib/security'
import { getVersion } from '@/lib/versions'

/**
 * Rolls a set back to an earlier version ({ version }) or to a downloaded backup file ({ snapshot }).
 * The restore itself is saved as a new version, so it can be undone the same way.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id) || !(await queryOne(`SELECT 1 AS x FROM question_sets WHERE id = $1`, [id]))) return jsonError(404, 'Question set not found.')
  const b = (await readJson<{ version?: unknown; snapshot?: unknown }>(request, 1_000_000)) ?? {}
  let snapshot: unknown
  let from: number | string
  if (Number.isInteger(b.version)) {
    const v = await getVersion('question_set', id, b.version as number)
    if (!v) return jsonError(404, 'That version was not found.')
    snapshot = v.snapshot
    from = v.version
  } else {
    // A backup file: either a raw snapshot or the full download (which wraps it in { snapshot }).
    const raw = b.snapshot as Record<string, unknown> | undefined
    snapshot = raw && 'snapshot' in raw ? raw.snapshot : raw
    from = 'an uploaded backup file'
  }
  if (!validSnapshot(snapshot)) return jsonError(400, 'This is not a valid question set backup.')
  if (snapshot.questions.length > 1000) return jsonError(400, 'Backup is too large.')
  await restoreSet(id, snapshot, admin.email, from)
  return jsonOk()
}
