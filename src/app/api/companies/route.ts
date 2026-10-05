import { getCurrentUser } from '@/lib/auth'
import { HIRING_CLAIM, hiringCompanies } from '@/lib/hiring'
import { jsonError, jsonOk } from '@/lib/security'

/** The companies card in the chat: 15 well-known names first, then the full list to browse. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const all = await hiringCompanies()
  return jsonOk({
    claim: HIRING_CLAIM,
    featured: all.filter((c) => c.featured).slice(0, 15).map(({ name, category, alumni }) => ({ name, category, alumni })),
    companies: all.map(({ name, category, alumni }) => ({ name, category, alumni })),
  })
}
