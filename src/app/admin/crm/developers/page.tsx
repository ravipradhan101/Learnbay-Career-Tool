import { notFound } from 'next/navigation'
import { ApiKeys, Deliveries, Webhooks } from '@/components/crm/DevTools'
import { requireStaff } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { env } from '@/lib/env'
import { WEBHOOK_EVENTS } from '@/lib/crm/webhooks'

export const metadata = { title: 'Developers' }

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null)

export default async function DevelopersPage() {
  const me = await requireStaff()
  if (me.role !== 'admin') notFound()
  const [keys, endpoints, deliveries] = await Promise.all([
    query<{ id: string; name: string; prefix: string; scopes: string[]; created_at: Date; last_used_at: Date | null; revoked_at: Date | null }>(
      `SELECT id, name, prefix, scopes, created_at, last_used_at, revoked_at FROM api_keys ORDER BY revoked_at NULLS FIRST, created_at DESC`,
    ),
    query<{ id: string; url: string; description: string | null; events: string[]; active: boolean; created_at: Date; last_status: number | null; last_ok: boolean | null; last_at: Date | null }>(
      `SELECT e.id, e.url, e.description, e.events, e.active, e.created_at, d.status AS last_status, d.ok AS last_ok, d.created_at AS last_at
         FROM webhook_endpoints e
         LEFT JOIN LATERAL (SELECT status, ok, created_at FROM webhook_deliveries WHERE endpoint_id = e.id ORDER BY created_at DESC LIMIT 1) d ON true
        ORDER BY e.created_at DESC`,
    ),
    query<{ id: string; endpoint: string; event: string; status: number | null; ok: boolean; duration_ms: number | null; created_at: Date }>(
      `SELECT d.id::text, e.url AS endpoint, d.event, d.status, d.ok, d.duration_ms, d.created_at FROM webhook_deliveries d JOIN webhook_endpoints e ON e.id = d.endpoint_id ORDER BY d.created_at DESC LIMIT 40`,
    ),
  ])
  const base = env.appUrl
  const lookupOn = Boolean(process.env.CRM_LOOKUP_URL)
  const hookOn = Boolean(process.env.CRM_WEBHOOK_URL)

  return (
    <>
      <div className="crm-page-head">
        <div>
          <h1>Developers</h1>
          <p className="muted small">Connect the Pseudo Sales CRM to the main Sales CRM or any other tool: an API to read and send leads, and signed webhooks for everything that happens.</p>
        </div>
      </div>

      <section className="crm-panel">
        <div className="crm-panel-head"><h2>Main Sales CRM connection</h2><span className="crm-faint">Set in the server environment (Vercel → Settings → Environment Variables)</span></div>
        <div className="crm-plan-grid">
          <div className="crm-card"><span className="crm-label">Duplicate check (lookup)</span><b>{lookupOn ? 'Connected' : 'Not set'}</b><span className="crm-faint"><code>CRM_LOOKUP_URL</code> and <code>CRM_API_KEY</code>. Every new lead is checked by email and phone first.</span></div>
          <div className="crm-card"><span className="crm-label">Events to the main CRM</span><b>{hookOn ? 'Connected' : 'Not set'}</b><span className="crm-faint"><code>CRM_WEBHOOK_URL</code> (and <code>CRM_WEBHOOK_SECRET</code> to sign). Or add it as an endpoint below.</span></div>
          <div className="crm-card"><span className="crm-label">API base</span><b><code>{base}/api/v1</code></b><span className="crm-faint">{keys.filter((k) => !k.revoked_at).length} active key(s) · {endpoints.filter((e) => e.active).length} live endpoint(s)</span></div>
        </div>
      </section>

      <div className="crm-dev-grid">
        <ApiKeys keys={keys.map((k) => ({ ...k, created_at: iso(k.created_at)!, last_used_at: iso(k.last_used_at), revoked_at: iso(k.revoked_at) }))} />
        <Webhooks endpoints={endpoints.map((e) => ({ ...e, created_at: iso(e.created_at)!, last_at: iso(e.last_at) }))} events={WEBHOOK_EVENTS.map((e) => ({ id: e.id, label: e.label }))} />
      </div>

      <Deliveries rows={deliveries.map((d) => ({ ...d, created_at: iso(d.created_at)! }))} />

      <section className="crm-panel crm-docs" id="docs">
        <div className="crm-panel-head"><h2>API and webhook reference</h2><a className="crm-link" href="/api/v1" target="_blank" rel="noreferrer">/api/v1 index ↗</a></div>

        <h3>The one rule: never override</h3>
        <p>People are matched by <b>email first, then phone</b> (last 10 digits). When a person already exists, nothing is overwritten. Only empty fields (name, phone) are filled, and everything else you send is kept as a note on the lead. Webhooks follow the same rule for the main CRM: <code>&quot;mode&quot;: &quot;enrich&quot;</code> means the main CRM already had this person, so add what is missing and append the activity. <code>&quot;create&quot;</code> means it is new.</p>

        <h3>Authentication</h3>
        <p>Create a key above and send it on every call. Read keys can look up and read leads; write keys can also create leads, add notes and sync status. Limit: 1,200 calls an hour per key.</p>
        <pre className="crm-code"><code>{`Authorization: Bearer lbk_…`}</code></pre>

        <h3><span className="crm-method">GET</span>/api/v1/leads/lookup?email=&amp;phone=</h3>
        <p>Does this person exist here?</p>
        <pre className="crm-code"><code>{`curl "${base}/api/v1/leads/lookup?email=asha@example.com&phone=%2B919876543210" \\
  -H "Authorization: Bearer $LEARNBAY_API_KEY"

{ "ok": true, "exists": true, "id": "7c1e…", "matchedBy": "email" }`}</code></pre>

        <h3><span className="crm-method">GET</span>/api/v1/leads/&#123;id&#125;</h3>
        <p>Everything about one lead: contact, owner, status, profile, best-fit path (recommended / next best / one more), reports, skill gap, roadmap, eligibility test (score, band, by topic), intent score with its reasons, and the AI brief (pain points, what they want, liked, skipped, objections, buying signals, next best action).</p>
        <pre className="crm-code"><code>{`curl ${base}/api/v1/leads/7c1e… -H "Authorization: Bearer $LEARNBAY_API_KEY"`}</code></pre>

        <h3><span className="crm-method">GET</span>/api/v1/leads?updated_since=&amp;limit=&amp;cursor=</h3>
        <p>Leads changed since a time, oldest change first (limit 1–200, default 50). Keep calling with <code>nextCursor</code> until it is <code>null</code>; save the last <code>changedAt</code> for the next sync.</p>
        <pre className="crm-code"><code>{`curl "${base}/api/v1/leads?updated_since=2026-10-01T00:00:00Z&limit=100" -H "Authorization: Bearer $LEARNBAY_API_KEY"`}</code></pre>

        <h3><span className="crm-method post">POST</span>/api/v1/leads <span className="crm-faint">(write)</span></h3>
        <p>Create a lead, or enrich an existing one. <code>ownerEmail</code> gives a new lead to that team member (if they work here); otherwise the usual duplicate check and round robin decide. Answers <code>201</code> when created, <code>200</code> with <code>existed: true</code> when matched.</p>
        <pre className="crm-code"><code>{`curl -X POST ${base}/api/v1/leads \\
  -H "Authorization: Bearer $LEARNBAY_API_KEY" -H "Content-Type: application/json" \\
  -d '{ "email": "asha@example.com", "phone": "+919876543210", "name": "Asha Rao",
        "crmId": "L-10293", "ownerEmail": "isha@learnbay.co", "note": "Came from the webinar" }'

{ "ok": true, "id": "7c1e…", "existed": true, "matchedBy": "phone", "filled": ["name"], "noteAdded": true,
  "message": "Lead already exists. Nothing was overwritten." }`}</code></pre>

        <h3><span className="crm-method post">POST</span>/api/v1/leads/&#123;id&#125;/notes <span className="crm-faint">(write)</span></h3>
        <pre className="crm-code"><code>{`curl -X POST ${base}/api/v1/leads/7c1e…/notes -H "Authorization: Bearer $LEARNBAY_API_KEY" \\
  -H "Content-Type: application/json" -d '{ "text": "Spoke on 12 Oct, wants weekend batch" }'`}</code></pre>

        <h3><span className="crm-method patch">PUT</span>/api/v1/leads/&#123;id&#125;/status <span className="crm-faint">(write)</span></h3>
        <p>Staff can’t change status in this app; the main CRM owns it and syncs it here. One of <code>new, contacted, interested, not_interested, enrolled, lost</code>.</p>
        <pre className="crm-code"><code>{`curl -X PUT ${base}/api/v1/leads/7c1e…/status -H "Authorization: Bearer $LEARNBAY_API_KEY" \\
  -H "Content-Type: application/json" -d '{ "status": "interested" }'`}</code></pre>

        <h3>Webhook events</h3>
        <ul>{WEBHOOK_EVENTS.map((e) => <li key={e.id}><code>{e.id}</code>: {e.label}</li>)}</ul>
        <pre className="crm-code"><code>{`POST https://your-crm.example.com/hooks/learnbay
X-Learnbay-Event: call.logged
X-Learnbay-Delivery: evt_9fQ…           (unique: ignore repeats)
X-Learnbay-Signature: t=1791400000,v1=5d1c…

{
  "id": "evt_9fQ…", "event": "call.logged", "createdAt": "2026-10-07T10:30:00.000Z",
  "mode": "enrich", "policy": "never_override",
  "match": { "email": "asha@example.com", "phone": "+919876543210" },
  "lead": { "id": "7c1e…", "name": "Asha Rao", "status": "contacted", "owner": { "email": "isha@learnbay.co", … },
            "crm": { "id": "L-10293", "existed": true, "matchedBy": "phone" }, "intent": { "score": 68, "band": "hot" }, "url": "…" },
  "data": { "outcome": "connected", "closed": true, "note": "Wants the weekend batch" }
}`}</code></pre>

        <h3>Check the signature (Node.js)</h3>
        <p>Sign <code>{'`${t}.${rawBody}`'}</code> with HMAC-SHA256 and the endpoint’s secret, compare in constant time, and reject anything older than 5 minutes.</p>
        <pre className="crm-code"><code>{`import crypto from 'node:crypto'

function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const expected = crypto.createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}`}</code></pre>

        <h3>What the main CRM’s lookup must answer</h3>
        <p>When <code>CRM_LOOKUP_URL</code> is set, every new lead is checked before it is assigned:</p>
        <pre className="crm-code"><code>{`POST $CRM_LOOKUP_URL            Authorization: Bearer $CRM_API_KEY
{ "email": "asha@example.com", "phone": "+919876543210" }

→ { "exists": true, "crmId": "L-10293", "matchedBy": "phone", "ownerEmail": "isha@learnbay.co" }
→ { "exists": false }`}</code></pre>
        <p>If it exists, the lead goes to that owner when they work here, the match is shown on the lead page, and every later webhook for that person is sent as <code>&quot;mode&quot;: &quot;enrich&quot;</code>.</p>
      </section>
    </>
  )
}
