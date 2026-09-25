import { getCurrentUser } from '@/lib/auth'
import { getTestState } from '@/lib/eligibility'
import { jsonError, jsonOk } from '@/lib/security'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  return jsonOk({ state: await getTestState(user.id) })
}
