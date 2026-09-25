import { adminGuard, body } from '@/lib/email/admin'
import { setEligibilityEnabled } from '@/lib/eligibility-sets'
import { jsonError, jsonOk } from '@/lib/security'

/** Shows or hides the eligibility test for every learner ({ enabled: boolean }). */
export async function POST(request: Request) {
  const admin = await adminGuard(request)
  if (admin instanceof Response) return admin
  const b = await body(request)
  if (typeof b.enabled !== 'boolean') return jsonError(400, 'Invalid request.')
  await setEligibilityEnabled(b.enabled)
  return jsonOk()
}
