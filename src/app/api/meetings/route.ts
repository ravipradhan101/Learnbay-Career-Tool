import { getCurrentUser } from '@/lib/auth'
import { availability, bookForLearner, upcomingFor } from '@/lib/meet/meetings'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'

/** The learner's video call with an expert: their upcoming one, plus "connect now" and open times when they have none. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const meeting = await upcomingFor(user.id)
  if (meeting) return jsonOk({ enabled: true, meeting, now: null, days: [] })
  return jsonOk({ meeting: null, ...(await availability(user.id)) })
}

/** { now: true } connects them with an expert in 30 minutes; { startsAt } books an open slot. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`meet:user:${user.id}`, 8, 24 * 3600))) return jsonError(429, 'You’ve tried a few times today. Please book a phone call instead, and we’ll be in touch.')
  const body = (await readJson<{ now?: unknown; startsAt?: unknown; source?: unknown }>(request, 2_000)) ?? {}
  const r = await bookForLearner(user.id, body)
  if (!r.ok) return jsonError(r.status, r.error, { next: r.next ?? null })
  return jsonOk({ meeting: r.meeting, message: `Booked for ${r.meeting.when} (IST).` })
}
