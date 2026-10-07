import { getCurrentUser } from '@/lib/auth'
import { allocateCounsellor, endCounsellorChat, switchCounsellor } from '@/lib/counsellor-server'
import { COUNSELLORS, type CounsellorId } from '@/lib/counsellors'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { ratingsOf } from '@/lib/reviews'

/** Every counsellor's rating (shown on the "your counsellor" card and profiles). */
export async function GET() {
  return jsonOk({ ratings: await ratingsOf(COUNSELLORS.map((c) => c.id)) })
}

/** Assign a counsellor, end the chat (next visit gets a new counsellor), or reconnect one the learner asked for. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`counsellor:${user.id}`, 20, 3600))) return jsonError(429, 'Please try again in a little while.')
  const body = await readJson<{ action?: unknown; to?: unknown }>(request, 500)
  if (body?.action === 'assign') {
    // Woody's "finding your counsellor" step: the next counsellor in the rotation (or the current one if active).
    const c = await allocateCounsellor(user.id)
    return jsonOk({ counsellor: c })
  }
  if (body?.action === 'end') {
    await endCounsellorChat(user.id)
    return jsonOk({ ended: true })
  }
  if (body?.action === 'switch' && COUNSELLORS.some((c) => c.id === body.to)) {
    return jsonOk({ counsellor: await switchCounsellor(user.id, body.to as CounsellorId) })
  }
  return jsonError(400, 'Invalid request.')
}
