import { adminLogin } from '@/lib/admin-auth'
import { clientIp, isSameOrigin, jsonError, jsonOk, normalizeEmail, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<{ email?: unknown; password?: unknown }>(request, 2_000)
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || password.length > 200) return jsonError(400, 'Enter your admin email and password.')
  const result = await adminLogin(email, password, clientIp(request))
  if (!result.ok) return jsonError(result.status, result.error)
  return jsonOk({ redirect: '/admin' })
}
