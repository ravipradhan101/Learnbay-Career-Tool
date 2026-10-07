import { createSign, randomUUID } from 'node:crypto'

/**
 * Google Meet links through the Google Calendar API, using a Google Workspace service account with domain-wide
 * delegation (scope https://www.googleapis.com/auth/calendar.events). The event is created on the host's own calendar
 * (impersonating their work email), so the Meet room belongs to the expert. Switched off until both are set:
 *   GOOGLE_SA_EMAIL        the service account's email
 *   GOOGLE_SA_PRIVATE_KEY  its private key (PEM; "\n" escapes are accepted)
 *   GOOGLE_MEET_ORGANIZER  optional: a Workspace user to host events when the expert's own address can't be used
 * Without it, the expert's saved Google Meet link is used (CRM → Team → My profile).
 * Keys come only from the environment, never from code.
 */
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

function creds() {
  const email = process.env.GOOGLE_SA_EMAIL
  const key = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n')
  return email && key?.includes('PRIVATE KEY') ? { email, key } : null
}
export const googleMeetConfigured = () => Boolean(creds())

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url')

async function accessToken(subject: string): Promise<string> {
  const c = creds()
  if (!c) throw new Error('Google is not configured')
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: c.email, sub: subject, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(c.key).toString('base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(8_000),
  })
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string }
  if (!res.ok || !data.access_token) throw new Error(`Google token failed: ${data.error ?? res.status}`)
  return data.access_token
}

export type MeetEvent = { eventId: string; meetUrl: string; organizer: string }

/** Creates a calendar event with a Meet room. Tries the host's own calendar, then the shared organizer. Null on failure. */
export async function createMeetEvent(e: { hostEmail: string; summary: string; description: string; start: Date; end: Date; attendees: string[] }): Promise<MeetEvent | null> {
  if (!creds()) return null
  const organizers = [...new Set([e.hostEmail, process.env.GOOGLE_MEET_ORGANIZER].filter(Boolean) as string[])]
  for (const organizer of organizers) {
    try {
      const token = await accessToken(organizer)
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: e.summary,
          description: e.description,
          start: { dateTime: e.start.toISOString(), timeZone: 'Asia/Kolkata' },
          end: { dateTime: e.end.toISOString(), timeZone: 'Asia/Kolkata' },
          attendees: e.attendees.map((email) => ({ email })),
          conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
        }),
        signal: AbortSignal.timeout(10_000),
      })
      const data = (await res.json().catch(() => ({}))) as { id?: string; hangoutLink?: string }
      if (res.ok && data.id && data.hangoutLink) return { eventId: data.id, meetUrl: data.hangoutLink, organizer }
      console.error('[meet] event create failed', organizer, res.status)
    } catch (err) {
      console.error('[meet] google error', (err as Error).message)
    }
  }
  return null
}

export async function cancelMeetEvent(organizer: string, eventId: string): Promise<void> {
  if (!creds()) return
  try {
    const token = await accessToken(organizer)
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.error('[meet] cancel failed', (err as Error).message)
  }
}

/** A standard Google Meet room link, e.g. https://meet.google.com/abc-defg-hij */
export const MEET_URL = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/
export function cleanMeetUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const url = v.trim().replace(/\?.*$/, '').replace(/\/$/, '').toLowerCase()
  return MEET_URL.test(url) ? url : null
}
