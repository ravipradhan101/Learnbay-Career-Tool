import { getCurrentStaff, type StaffUser } from '../admin-auth'
import { queryOne } from '../db'
import { isSameOrigin, jsonError, rateLimit, readJson } from '../security'
import { canSeeLead, staffDirectory } from './scope'

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** Every CRM API call: same-origin (for writes), a signed-in active staff member, and a generous per-person rate limit. */
export async function staffGuard(request: Request, write = true): Promise<StaffUser | Response> {
  if (write && !isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const staff = await getCurrentStaff()
  if (!staff) return jsonError(401, 'Please sign in again.')
  if (write && !(await rateLimit(`crm:write:${staff.id}`, 600, 3600))) return jsonError(429, 'Too many changes in a short time. Please wait a few minutes.')
  return staff
}

export async function body(request: Request, max = 20_000): Promise<Record<string, unknown>> {
  return (await readJson<Record<string, unknown>>(request, max)) ?? {}
}

export type LeadRef = { id: string; email: string; name: string | null; phone_country: string | null; phone: string | null; owner_id: string | null; status: string | null }

/**
 * The lead, if `me` may work on it. A lead outside someone's scope answers exactly like a lead that doesn't exist,
 * so ids can't be probed.
 */
export async function leadFor(me: StaffUser, userId: unknown): Promise<LeadRef | Response> {
  if (!isUuid(userId)) return jsonError(404, 'Lead not found.')
  const lead = await queryOne<LeadRef>(
    `SELECT u.id, u.email, u.name, u.phone_country, u.phone, lo.owner_id, lo.status
       FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE u.id = $1`,
    [userId],
  )
  if (!lead || !canSeeLead(me, lead.owner_id, await staffDirectory())) return jsonError(404, 'Lead not found.')
  return lead
}
