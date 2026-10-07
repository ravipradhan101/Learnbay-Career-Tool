import { body } from '@/lib/crm/guard'
import { adminGuard } from '@/lib/crm/dev-guard'
import { eventsFrom, newWebhookSecret, webhookUrlProblem } from '@/lib/crm/webhooks'
import { queryOne } from '@/lib/db'
import { cleanText, jsonError, jsonOk } from '@/lib/security'

/** Adds a webhook endpoint. Its signing secret is returned once. */
export async function POST(request: Request) {
  const me = await adminGuard(request)
  if (me instanceof Response) return me
  const b = await body(request)
  const problem = webhookUrlProblem(b.url)
  if (problem) return jsonError(400, problem)
  const events = eventsFrom(b.events)
  if (!events.length) return jsonError(400, 'Choose at least one event.')
  const secret = newWebhookSecret()
  const r = await queryOne<{ id: string }>(
    `INSERT INTO webhook_endpoints (url, description, events, secret, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [String(b.url).trim(), cleanText(b.description, 120) || null, events, secret, me.id],
  )
  return jsonOk({ id: r?.id, secret, message: 'Endpoint added. Copy the signing secret now: it will not be shown again.' }, 201)
}
