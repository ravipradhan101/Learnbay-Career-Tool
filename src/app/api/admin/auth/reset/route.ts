import { resetAdminPassword } from '@/lib/admin-auth'
import { clientIp, isSameOrigin, jsonError, jsonOk, normalizeEmail, rateLimit, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  if (!(await rateLimit(`adminreset:ip:${clientIp(request)}`, 20, 900))) return jsonError(429, 'Too many attempts. Please wait 15 minutes.')
  const body = await readJson<{ email?: unknown; code?: unknown; password?: unknown }>(request, 2_000)
  const email = normalizeEmail(body?.email)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !code || !password) return jsonError(400, 'Enter the code and a new password.')
  const result = await resetAdminPassword(email, code, password)
  if (!result.ok) return jsonError(result.status, result.error)
  return jsonOk({ redirect: '/admin' })
}
