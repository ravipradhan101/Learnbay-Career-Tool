import { WEBHOOK_EVENTS } from '@/lib/crm/webhooks'

/** A short, machine-readable index of the API. Full docs: /admin/crm/developers (admin sign-in). */
export function GET() {
  return Response.json({
    name: 'Learnbay Pseudo Sales CRM API', version: 'v1',
    auth: 'Authorization: Bearer lbk_… (create keys on /admin/crm/developers)',
    rule: 'never_override: a person matched by email or phone is never overwritten; only empty fields are filled and the rest is kept as a note.',
    endpoints: [
      'GET  /api/v1/leads?updated_since=ISO&limit=1..200&cursor=…   (read)',
      'GET  /api/v1/leads/lookup?email=…&phone=…                   (read)',
      'GET  /api/v1/leads/{id}                                      (read)',
      'POST /api/v1/leads                                           (write) { email, phone, name, note, crmId, ownerEmail }',
      'POST /api/v1/leads/{id}/notes                                (write) { text }',
      'PUT  /api/v1/leads/{id}/status                               (write) { status }  sync from the main CRM',
    ],
    webhookEvents: WEBHOOK_EVENTS.map((e) => e.id),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
