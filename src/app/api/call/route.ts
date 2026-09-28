import { getCurrentUser } from '@/lib/auth'
import { requestCall } from '@/lib/calls'
import { counsellorOf } from '@/lib/counsellor-server'
import { BOT_NAME, getCounsellor } from '@/lib/counsellors'
import { getAnswers } from '@/lib/data'
import { experienceLabel, interestLabel, isValidPhone, roleLabel } from '@/lib/questions'
import { cleanText, clientIp, isSameOrigin, jsonError, jsonOk, rateLimits, readJson } from '@/lib/security'

/** "Call me": from the call button (any page, signed in or not) or when the counsellor offers a call in the chat. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<{ source?: unknown; name?: unknown; phoneCountry?: unknown; phone?: unknown; consent?: unknown }>(request, 2_000)
  const source = body?.source === 'chat' ? 'chat' : 'button'
  const user = await getCurrentUser()

  if (user) {
    if (!(await rateLimits([[`call:user:${user.id}`, 3, 3600]]))) return jsonError(429, 'We already have your call request. A counsellor will call you shortly.')
    if (!user.phone) return jsonError(400, 'Please add your phone number first.')
    const [answers, counsellor] = await Promise.all([getAnswers(user.id), counsellorOf(user.id)])
    const profile = answers ? `${roleLabel(answers)}, ${experienceLabel(answers)}, interested in ${interestLabel(answers)}` : undefined
    return jsonOk(await requestCall({
      userId: user.id, name: user.name ?? '', phoneCountry: user.phone_country ?? '+91', phone: user.phone, counsellor: getCounsellor(counsellor).name, source, profile,
    }))
  }

  // Before sign-up: a name and number are enough to ask for a call (plain text only, rate limited).
  if (!(await rateLimits([[`call:ip:${clientIp(request)}`, 3, 3600], ['call:global', 300, 3600]]))) return jsonError(429, 'Too many call requests from this network. Please try again later.')
  const name = cleanText(body?.name, 80) ?? ''
  const phoneCountry = typeof body?.phoneCountry === 'string' ? body.phoneCountry : '+91'
  const phone = typeof body?.phone === 'string' ? body.phone.replace(/[\s-]/g, '') : ''
  if (name.length < 2) return jsonError(400, 'Please enter your name.')
  if (!isValidPhone(phoneCountry, phone)) return jsonError(400, 'Please enter a valid phone number.')
  if (body?.consent !== true) return jsonError(400, 'Please agree so we can call you.')
  return jsonOk(await requestCall({ userId: null, name, phoneCountry, phone, counsellor: BOT_NAME, source: 'guest' }))
}
