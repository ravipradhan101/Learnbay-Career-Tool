import { getCurrentUser } from '@/lib/auth'
import { submitAnswer } from '@/lib/eligibility'
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimit(`elig:answer:${user.id}`, 120, 3600))) return jsonError(429, 'Too many requests.')
  const body = await readJson<{ index?: unknown; choice?: unknown }>(request, 500)
  const index = typeof body?.index === 'number' && Number.isInteger(body.index) ? body.index : -1
  const choice = typeof body?.choice === 'number' && Number.isInteger(body.choice) ? body.choice : null
  if (index < 0 || index > 50) return jsonError(400, 'Invalid answer.')
  return jsonOk({ state: await submitAnswer(user.id, index, choice) })
}
