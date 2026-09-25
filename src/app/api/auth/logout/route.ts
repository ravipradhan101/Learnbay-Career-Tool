import { destroySession } from '@/lib/auth'
import { isSameOrigin, jsonError, jsonOk } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  await destroySession()
  return jsonOk()
}
