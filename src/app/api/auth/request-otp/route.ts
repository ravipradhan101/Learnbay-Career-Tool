import { issueOtp } from '@/lib/auth'
import { resolveLoginEmail } from '@/lib/login-identity'
import { clientIp, isSameOrigin, jsonError, jsonOk, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<{ email?: unknown }>(request, 2_000)
  const resolved = await resolveLoginEmail(body?.email)
  if ('error' in resolved) return jsonError(400, resolved.error)
  const result = await issueOtp(resolved.email, clientIp(request))
  if (!result.ok) return jsonError(result.status, result.error)
  return jsonOk({ message: `We sent a 6-digit code to ${resolved.email}.` })
}
