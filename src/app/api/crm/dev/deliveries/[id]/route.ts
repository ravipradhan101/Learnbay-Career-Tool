import { adminGuard } from '@/lib/crm/dev-guard'
import { resend } from '@/lib/crm/webhooks'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

/** The full body of one delivery and the receiver's answer. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminGuard(request, false)
  if (me instanceof Response) return me
  const id = Number((await params).id)
  const d = Number.isSafeInteger(id) ? await queryOne<{ payload: unknown; response: string | null }>(`SELECT payload, response FROM webhook_deliveries WHERE id = $1`, [id]) : null
  return d ? jsonOk({ payload: d.payload, response: d.response }) : jsonError(404, 'Delivery not found.')
}

/** Sends a logged delivery again (same body, fresh signature). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminGuard(request)
  if (me instanceof Response) return me
  if (!(await rateLimit(`crm:dev:resend:${me.id}`, 60, 3600))) return jsonError(429, 'Too many resends in an hour.')
  const id = Number((await params).id)
  const r = Number.isSafeInteger(id) ? await resend(id) : null
  if (!r) return jsonError(404, 'Delivery not found.')
  return jsonOk({ delivered: r.ok, httpStatus: r.status, durationMs: r.durationMs, message: r.ok ? `Delivered: HTTP ${r.status}.` : `Failed again: ${r.status ? `HTTP ${r.status}` : r.response}.` })
}
