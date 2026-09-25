import { getCurrentAdmin } from '@/lib/admin-auth'
import { isUuid } from '@/lib/email/admin'
import { downloadJson, getVersion } from '@/lib/versions'

/** Downloads one version of a question set as a JSON backup file. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  if (!(await getCurrentAdmin())) return new Response('Not found', { status: 404 })
  const { id, version } = await params
  const n = Number(version)
  if (!isUuid(id) || !Number.isInteger(n)) return new Response('Not found', { status: 404 })
  const v = await getVersion('question_set', id, n)
  if (!v) return new Response('Not found', { status: 404 })
  return downloadJson(`question-set-${id.slice(0, 8)}-v${n}.json`, {
    type: 'learnbay-question-set', setId: id, version: v.version, savedAt: v.created_at, savedBy: v.created_by, note: v.note, snapshot: v.snapshot,
  })
}
