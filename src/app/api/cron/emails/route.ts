import { timingSafeEqual } from 'node:crypto'
import { ensureDefaultFlows, processDueEmails } from '@/lib/email/flows'

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
  return Response.json(await processDueEmails())
}

export const GET = POST
