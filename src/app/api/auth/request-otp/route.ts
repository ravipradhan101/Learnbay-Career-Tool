import { findUserByEmail, issueOtp } from '@/lib/auth'
import { emailProblem } from '@/lib/email-check'
import { resolveLoginEmail } from '@/lib/login-identity'
import { clientIp, isSameOrigin, jsonError, jsonOk, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<{ email?: unknown }>(request, 2_000)
  const resolved = await resolveLoginEmail(body?.email)
  if ('error' in resolved) return jsonError(400, resolved.error)
  // Logging in with an email that has no account opens one once the code is verified, so it meets the same email
  // rules as sign-up (no temporary inboxes, test domains or typos).
  if (!(await findUserByEmail(resolved.email))) {
    const problem = await emailProblem(resolved.email)
    if (problem) return jsonError(400, problem, { field: 'email' })
  }
  const result = await issueOtp(resolved.email, clientIp(request))
  if (!result.ok) return jsonError(result.status, result.error)
  return jsonOk({ message: `We sent a 6-digit code to ${resolved.email}.` })
}
