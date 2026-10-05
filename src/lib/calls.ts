import { env } from './env'
import { queryOne, query } from './db'
import { sendMail } from './mailer'
import { CALL_HOURS } from './sessions'

export type CallRequest = {
  userId: string | null
  name: string
  phoneCountry: string
  phone: string
  counsellor: string
  source: 'button' | 'chat' | 'guest'
  profile?: string
}

/**
 * A learner asked for a call. It is always saved and the counsellor team is emailed. If an outbound-call
 * provider is configured (CALL_TRIGGER_URL), it is asked to have the AI counsellor call the learner now.
 */
export async function requestCall(r: CallRequest): Promise<{ calling: boolean; message: string }> {
  const saved = await queryOne<{ id: string }>(
    `INSERT INTO call_requests (user_id, name, phone_country, phone, counsellor, source) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [r.userId, r.name || null, r.phoneCountry, r.phone, r.counsellor, r.source],
  )
  if (r.userId) await query(`INSERT INTO lead_events (user_id, type, detail) VALUES ($1, 'call_requested', $2)`, [r.userId, JSON.stringify({ source: r.source, counsellor: r.counsellor })])

  let calling = false
  let detail = 'queued'
  const url = env.callTriggerUrl
  if (url) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(env.callTriggerSecret ? { Authorization: `Bearer ${env.callTriggerSecret}` } : {}) },
        body: JSON.stringify({ requestId: saved?.id, name: r.name, phone: `${r.phoneCountry}${r.phone}`, counsellor: r.counsellor, profile: r.profile ?? '' }),
        signal: AbortSignal.timeout(8_000),
      })
      calling = res.ok
      detail = res.ok ? 'triggered' : `provider responded ${res.status}`
    } catch (err) {
      detail = `provider error: ${(err as Error).message}`.slice(0, 300)
    }
  }
  await query(`UPDATE call_requests SET status = $2, detail = $3 WHERE id = $1`, [saved?.id, calling ? 'triggered' : url ? 'failed' : 'new', detail])

  const notify = env.counsellorNotifyEmail
  if (notify) {
    sendMail({
      to: notify,
      subject: `${calling ? 'AI call placed' : 'Call back now'}: ${r.name || 'a visitor'} (${r.phoneCountry} ${r.phone})`,
      heading: calling ? 'The AI counsellor is calling this learner' : 'A learner asked for a call: please call back',
      paragraphs: [
        `Name: ${r.name || '(not given)'}`,
        `Phone: ${r.phoneCountry} ${r.phone}`,
        `Counsellor in the chat: ${r.counsellor}`,
        `Asked from: ${r.source === 'guest' ? 'the home page, before sign-up' : r.source === 'chat' ? 'the chat' : 'the call button'}`,
        ...(r.profile ? [`Profile: ${r.profile}`] : []),
        ...(url && !calling ? ['The automatic call could not be placed, so please call manually.'] : []),
      ],
      ...(r.userId ? { cta: { label: 'Open this learner in admin', url: `${env.appUrl}/admin/users/${r.userId}` } } : {}),
    }).catch((err) => console.error('[calls] notify failed', (err as Error).message))
  }
  const masked = `${r.phoneCountry} ••••• ${r.phone.slice(-4)}`
  return {
    calling,
    message: calling
      ? `Calling you now on ${masked}. Pick up when it rings.`
      : `Got it. A Senior Counsellor will call you on ${masked} at the earliest available time, within 1 working day (${CALL_HOURS}).`,
  }
}
