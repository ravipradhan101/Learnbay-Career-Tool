import { adminLogout } from '@/lib/admin-auth'
import { isSameOrigin, jsonError, jsonOk } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  await adminLogout()
  return jsonOk({ redirect: '/admin/login' })
}
