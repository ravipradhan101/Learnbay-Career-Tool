import { query } from '@/lib/db'
import { validUnsubscribe } from '@/lib/email/flows'
import { readBodyCapped } from '@/lib/security'

/**
 * Unsubscribe from lifecycle emails (login codes and requested reports still arrive).
 * Handles the RFC 8058 one-click POST from Gmail/Yahoo (no cookies, no Origin) and the button on /unsubscribe.
 * The signed link itself is the authorisation, so no login is needed.
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const raw = (await readBodyCapped(request, 2_000))?.toString('utf8') ?? ''
  const form = new URLSearchParams(raw)
  const u = url.searchParams.get('u') ?? form.get('u')
  const t = url.searchParams.get('t') ?? form.get('t')
  const resubscribe = (url.searchParams.get('action') ?? form.get('action')) === 'resubscribe'
  if (!validUnsubscribe(u, t)) return new Response('Invalid link', { status: 400 })
  if (resubscribe) {
    await query(`UPDATE users SET marketing_opt_out_at = NULL WHERE id = $1`, [u])
  } else {
    await query(
      `WITH o AS (UPDATE users SET marketing_opt_out_at = coalesce(marketing_opt_out_at, now()) WHERE id = $1 RETURNING id)
       UPDATE email_enrollments SET status = 'exited', exit_reason = 'unsubscribed', finished_at = now() WHERE user_id = (SELECT id FROM o) AND status = 'active'`,
      [u],
    )
  }
  // The page's own form gets redirected back; mail providers' one-click requests just need a 200.
  if (form.get('from') === 'page') {
    return new Response(null, { status: 303, headers: { Location: `/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t!)}&done=${resubscribe ? 'resubscribed' : 'unsubscribed'}` } })
  }
  return new Response('OK', { status: 200 })
}
