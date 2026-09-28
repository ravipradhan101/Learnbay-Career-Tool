import { getCurrentUser } from '@/lib/auth'
import { getAnswers } from '@/lib/data'
import { getTestState, rulesOf } from '@/lib/eligibility'
import { activeSetFor } from '@/lib/eligibility-sets'
import { jsonError, jsonOk } from '@/lib/security'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const answers = await getAnswers(user.id)
  const set = await activeSetFor(answers?.interest)
  // The rules (question count, seconds, attempts) come from the admin's active question set.
  return jsonOk({ state: await getTestState(user.id, set ?? undefined), rules: rulesOf(set) })
}
