import { query } from '../db'

/**
 * The bridge to the main Sales CRM. Switched off until CRM_LOOKUP_URL is set, so this app works the same without it.
 * Keys come only from the environment, never from code.
 *
 * Lookup, on every NEW lead (a sign-up, a lead created by staff, or one sent in through the API):
 *   POST CRM_LOOKUP_URL   Authorization: Bearer CRM_API_KEY
 *   body     { "email": "asha@example.com", "phone": "+919876543210" }
 *   response { "exists": true, "crmId": "L-10293", "matchedBy": "email" | "phone", "ownerEmail": "isha@learnbay.co" | null }
 *            or { "exists": false }
 * (An older answer with only { "ownerEmail": … } still works.)
 *
 * When the person already exists there, nothing in the main CRM is overwritten: this app records the match and every
 * later webhook for them says "mode": "enrich", so the main CRM only adds what is missing. If the owner named by the
 * main CRM works here, the lead goes to them; otherwise round robin decides. Outgoing events live in ./webhooks.
 */
const TIMEOUT_MS = 5_000

export type CrmMatch = { exists: boolean; crmId: string | null; ownerEmail: string | null; matchedBy: 'email' | 'phone' | null }

export const crmConnected = () => Boolean(process.env.CRM_LOOKUP_URL)

/** What the main CRM knows about this person, or null (not connected, or it did not answer in time). */
export async function lookupCrm(lead: { email: string; phone: string | null }): Promise<CrmMatch | null> {
  const url = process.env.CRM_LOOKUP_URL
  if (!url?.startsWith('https://')) return null
  const key = process.env.CRM_API_KEY
  try {
    const res = await fetch(url, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(lead),
    })
    if (!res.ok) return null
    const d = (await res.json()) as Record<string, unknown>
    const ownerEmail = typeof d.ownerEmail === 'string' && d.ownerEmail.includes('@') ? d.ownerEmail.trim().toLowerCase() : null
    const rawId = d.crmId ?? d.id
    const crmId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).slice(0, 120) : null
    const exists = typeof d.exists === 'boolean' ? d.exists : Boolean(crmId || ownerEmail)
    const matchedBy = d.matchedBy === 'email' || d.matchedBy === 'phone' ? d.matchedBy : exists ? 'email' : null
    return { exists, crmId, ownerEmail, matchedBy }
  } catch (err) {
    console.error('[crm] lookup failed', (err as Error).message)
    return null
  }
}

/** Remembers what the main CRM said, so the lead page and every webhook can show it. */
export async function recordCrmMatch(userId: string, m: Pick<CrmMatch, 'exists' | 'crmId' | 'matchedBy'>): Promise<void> {
  await query(
    `INSERT INTO lead_external (user_id, crm_id, existed, matched_by, checked_at) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET crm_id = coalesce(EXCLUDED.crm_id, lead_external.crm_id), existed = lead_external.existed OR EXCLUDED.existed,
       matched_by = coalesce(lead_external.matched_by, EXCLUDED.matched_by), checked_at = now()`,
    [userId, m.crmId, m.exists, m.exists ? m.matchedBy : null],
  )
}
