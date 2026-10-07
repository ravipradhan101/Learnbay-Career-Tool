import { body, isUuid } from '@/lib/crm/guard'
import { adminGuard } from '@/lib/crm/dev-guard'
import { eventsFrom, newWebhookSecret, sendPing } from '@/lib/crm/webhooks'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

/** { action: 'test' | 'pause' | 'resume' | 'rotate' | 'events', events? } on one endpoint. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminGuard(request)
  if (me instanceof Response) return me
  const { id } = await params
  const ep = isUuid(id) ? await queryOne<{ id: string; url: string; secret: string }>(`SELECT id, url, secret FROM webhook_endpoints WHERE id = $1`, [id]) : null
  if (!ep) return jsonError(404, 'Endpoint not found.')
  const b = await body(request)
  switch (b.action) {
    case 'test': {
      if (!(await rateLimit(`crm:dev:ping:${me.id}`, 30, 3600))) return jsonError(429, 'Too many tests in an hour.')
      const r = await sendPing(ep)
      return jsonOk({ delivered: r.ok, httpStatus: r.status, durationMs: r.durationMs, message: r.ok ? `Delivered: HTTP ${r.status} in ${r.durationMs} ms.` : `Failed: ${r.status ? `HTTP ${r.status}` : r.response}.` })
    }
    case 'pause':
    case 'resume':
      await queryOne(`UPDATE webhook_endpoints SET active = $2 WHERE id = $1`, [id, b.action === 'resume'])
      return jsonOk({ message: b.action === 'resume' ? 'Endpoint is live again.' : 'Endpoint paused.' })
    case 'rotate': {
      const secret = newWebhookSecret()
      await queryOne(`UPDATE webhook_endpoints SET secret = $2 WHERE id = $1`, [id, secret])
      return jsonOk({ secret, message: 'New signing secret. Copy it now: the old one has stopped working.' })
    }
    case 'events': {
      const events = eventsFrom(b.events)
      if (!events.length) return jsonError(400, 'Choose at least one event.')
      await queryOne(`UPDATE webhook_endpoints SET events = $2 WHERE id = $1`, [id, events])
      return jsonOk({ message: 'Events saved.' })
    }
    default:
      return jsonError(400, 'Unknown action.')
  }
}

/** Removes the endpoint and its delivery log. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminGuard(request)
  if (me instanceof Response) return me
  const { id } = await params
  const r = isUuid(id) ? await queryOne(`DELETE FROM webhook_endpoints WHERE id = $1 RETURNING id`, [id]) : null
  return r ? jsonOk({ message: 'Endpoint removed.' }) : jsonError(404, 'Endpoint not found.')
}
