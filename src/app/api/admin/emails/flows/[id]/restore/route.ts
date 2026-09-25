import { adminGuard, isUuid, restoreFlow, validFlowSnapshot } from '@/lib/email/admin'
import { jsonError, jsonOk, readJson } from '@/lib/security'
import { getVersion } from '@/lib/versions'

/**
 * Rolls a flow back to an earlier version ({ version }) or to a downloaded backup file ({ snapshot }).
 * Also brings back a deleted flow (it returns paused). The restore is itself saved as a new version.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const { id } = await params
  if (!isUuid(id)) return jsonError(404, 'Flow not found.')
  const b = (await readJson<{ version?: unknown; snapshot?: unknown }>(request, 1_000_000)) ?? {}
  let snapshot: unknown
  let from: string
  if (Number.isInteger(b.version)) {
    const v = await getVersion('email_flow', id, b.version as number)
    if (!v) return jsonError(404, 'That version was not found.')
    snapshot = v.snapshot
    from = `version ${v.version}`
  } else {
    const raw = b.snapshot as Record<string, unknown> | undefined
    snapshot = raw && 'snapshot' in raw ? raw.snapshot : raw
    from = 'an uploaded backup file'
  }
  if (!validFlowSnapshot(snapshot)) return jsonError(400, 'This is not a valid email flow backup.')
  if (snapshot.steps.length > 200) return jsonError(400, 'Backup is too large.')
  await restoreFlow(id, snapshot, admin.email, from)
  return jsonOk()
}
