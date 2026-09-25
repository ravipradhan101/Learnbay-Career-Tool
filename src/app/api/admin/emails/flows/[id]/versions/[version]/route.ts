import { getCurrentAdmin } from '@/lib/admin-auth'
import { isUuid } from '@/lib/email/admin'
import { downloadJson, getVersion } from '@/lib/versions'

/** Downloads one version of an email flow as a JSON backup file. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  if (!(await getCurrentAdmin())) return new Response('Not found', { status: 404 })
  const { id, version } = await params
  const n = Number(version)
  if (!isUuid(id) || !Number.isInteger(n)) return new Response('Not found', { status: 404 })
  const v = await getVersion('email_flow', id, n)
  if (!v) return new Response('Not found', { status: 404 })
  return downloadJson(`email-flow-${id.slice(0, 8)}-v${n}.json`, {
    type: 'learnbay-email-flow', flowId: id, version: v.version, savedAt: v.created_at, savedBy: v.created_by, note: v.note, snapshot: v.snapshot,
  })
}
