import { requestAdminCode } from '@/lib/admin-auth'
import { clientIp, isSameOrigin, jsonError, jsonOk, normalizeEmail, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<{ email?: unknown }>(request, 2_000)
  const email = normalizeEmail(body?.email)
  if (!email) return jsonError(400, 'Enter a valid email.')
  const result = await requestAdminCode(email, clientIp(request))
  if (!result.ok) return jsonError(result.status, result.error)
  return jsonOk({ message: `If ${email} is an admin account, a 6-digit code is on its way.` })
}
