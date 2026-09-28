import { destroySession, getCurrentUser } from '@/lib/auth'
import { endCounsellorChat } from '@/lib/counsellor-server'
import { isSameOrigin, jsonError, jsonOk } from '@/lib/security'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  // Logging out ends the chat: next time, the next counsellor in the rotation picks up.
  const user = await getCurrentUser()
  if (user) await endCounsellorChat(user.id)
  await destroySession()
  return jsonOk()
}
