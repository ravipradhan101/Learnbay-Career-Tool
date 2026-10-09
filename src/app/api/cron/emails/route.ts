import { timingSafeEqual } from 'node:crypto'
import { ensureDefaultFlows, processDueEmails } from '@/lib/email/flows'
import { dailyCrmDigest } from '@/lib/crm/digest'
import { query } from '@/lib/db'

// Calls the AI or sends a batch of emails: allow time for it.
export const maxDuration = 60

/**
 * For hosts without a long-running server (serverless): call this from a scheduler with
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it with GET). Disabled (404) unless CRON_SECRET is set.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!secret || secret.length < 16 || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response('Not found', { status: 404 })
  }
  await ensureDefaultFlows()
  const emails = await processDueEmails()
  // The sales CRM's daily job runs separately: a failure there never affects learner emails.
  const crm = await dailyCrmDigest().catch((err) => ({ error: (err as Error).message }))
  const cleanup = await housekeeping().catch((err) => ({ error: (err as Error).message }))
  return Response.json({ ...emails, crm, cleanup })
}

export const GET = POST

/**
 * Expired and short-lived records only, in small batches (never personal data a learner or the team still uses):
 * rate-limit windows, used or expired sign-in codes and sessions, held sign-ups, and webhook delivery logs after 30 days.
 */
async function housekeeping() {
  const out: Record<string, number> = {}
  const batch = async (name: string, sql: string) => { out[name] = (await query(sql)).length }
  await batch('rate_limits', `DELETE FROM rate_limits WHERE ctid IN (SELECT ctid FROM rate_limits WHERE window_start < now() - interval '2 days' LIMIT 20000) RETURNING 1`)
  await batch('otp_codes', `DELETE FROM otp_codes WHERE id IN (SELECT id FROM otp_codes WHERE created_at < now() - interval '2 days' LIMIT 20000) RETURNING 1`)
  await batch('sessions', `DELETE FROM sessions WHERE ctid IN (SELECT ctid FROM sessions WHERE expires_at < now() - interval '1 day' LIMIT 20000) RETURNING 1`)
  await batch('pending_signups', `DELETE FROM pending_signups WHERE created_at < now() - interval '2 days' RETURNING 1`)
  await batch('webhook_deliveries', `DELETE FROM webhook_deliveries WHERE id IN (SELECT id FROM webhook_deliveries WHERE created_at < now() - interval '30 days' LIMIT 20000) RETURNING 1`)
  return out
}
