/**
 * The bridge to the company CRM (to be connected later). Both calls are optional and switched off until their URL is
 * set, so the app works the same without a CRM. Keys come only from the environment, never from code.
 *
 * Owner lookup, on every NEW lead (a new sign-up or a lead created by staff):
 *   POST CRM_LOOKUP_URL   Authorization: Bearer CRM_API_KEY
 *   body     { "email": "...", "phone": "+919876543210" }
 *   response { "ownerEmail": "isha@learnbay.co" }   or   { "ownerEmail": null } when the CRM has no owner
 * If the owner is an active staff account here, the lead is mapped to them; otherwise round robin decides.
 *
 * Events out (optional), so the CRM can mirror what happens here:
 *   POST CRM_WEBHOOK_URL  Authorization: Bearer CRM_API_KEY
 *   body { "event": "lead_created" | "lead_assigned" | "status_changed" | "call_logged", "lead": {...}, "at": ISO time }
 */
const TIMEOUT_MS = 5_000

function config() {
  const key = process.env.CRM_API_KEY
  return { lookupUrl: process.env.CRM_LOOKUP_URL, webhookUrl: process.env.CRM_WEBHOOK_URL, headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) } }
}

export const crmConnected = () => Boolean(process.env.CRM_LOOKUP_URL)

/** The CRM owner's email for this person, or null (no CRM, no owner, or the CRM did not answer in time). */
export async function lookupCrmOwner(lead: { email: string; phone: string | null }): Promise<string | null> {
  const { lookupUrl, headers } = config()
  if (!lookupUrl?.startsWith('https://')) return null
  try {
    const res = await fetch(lookupUrl, { method: 'POST', headers, body: JSON.stringify(lead), signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const data = (await res.json()) as { ownerEmail?: unknown }
    return typeof data.ownerEmail === 'string' && data.ownerEmail.includes('@') ? data.ownerEmail.trim().toLowerCase() : null
  } catch (err) {
    console.error('[crm] owner lookup failed', (err as Error).message)
    return null
  }
}

/** Fire-and-forget event to the CRM. Never throws. */
export async function notifyCrm(event: string, lead: Record<string, unknown>): Promise<void> {
  const { webhookUrl, headers } = config()
  if (!webhookUrl?.startsWith('https://')) return
  try {
    await fetch(webhookUrl, { method: 'POST', headers, body: JSON.stringify({ event, lead, at: new Date().toISOString() }), signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    console.error('[crm] webhook failed', (err as Error).message)
  }
}
