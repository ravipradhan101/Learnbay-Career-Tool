import { cache } from 'react'
import { query, queryOne } from '../db'
import type { StaffUser } from '../admin-auth'
import type { StaffRole } from './roles'

/**
 * Who can see and act on whom. Everything on the staff side goes through these functions:
 * - admin: everyone and every lead (including unassigned ones)
 * - manager: themselves, their associates, and ISMs under those associates or mapped to them directly
 * - associate: themselves and their ISMs
 * - ISM: themselves
 */
export type StaffRow = {
  id: string; email: string; name: string | null; phone: string | null; role: StaffRole; team: string | null
  manager_id: string | null; associate_id: string | null; active: boolean; in_rotation: boolean
  has_password: boolean; last_login_at: Date | null; rr_last_assigned_at: Date | null; created_at: Date
}

/** The whole team, once per request (a sales team is at most a few hundred people). */
export const staffDirectory = cache(async (): Promise<StaffRow[]> =>
  query<StaffRow>(
    `SELECT id, email, name, phone, role, team, manager_id, associate_id, active, in_rotation, password_hash IS NOT NULL AS has_password,
            last_login_at, rr_last_assigned_at, created_at
       FROM admin_users ORDER BY array_position(ARRAY['admin','manager','associate','ism'], role), lower(coalesce(name, email))`,
  ),
)

export function byId(dir: StaffRow[]): Map<string, StaffRow> {
  return new Map(dir.map((s) => [s.id, s]))
}

/** The manager a person rolls up to (an ISM under an associate rolls up to that associate's manager). */
export function managerOf(s: StaffRow | undefined, ids: Map<string, StaffRow>): StaffRow | null {
  if (!s) return null
  if (s.role === 'manager') return s
  if (s.role === 'associate') return s.manager_id ? ids.get(s.manager_id) ?? null : null
  if (s.role === 'ism') {
    if (s.associate_id) return managerOf(ids.get(s.associate_id), ids)
    return s.manager_id ? ids.get(s.manager_id) ?? null : null
  }
  return null
}

export function associateOf(s: StaffRow | undefined, ids: Map<string, StaffRow>): StaffRow | null {
  if (!s) return null
  if (s.role === 'associate') return s
  return s.role === 'ism' && s.associate_id ? ids.get(s.associate_id) ?? null : null
}

/** "ISM Priya → Associate Rahul → Manager Anita": who answers for a lead or a missed call. */
export function chainOf(ownerId: string | null, ids: Map<string, StaffRow>) {
  const owner = ownerId ? ids.get(ownerId) : undefined
  const associate = associateOf(owner, ids)
  const manager = managerOf(owner, ids)
  return { owner: owner ?? null, associate: associate && associate.id !== owner?.id ? associate : null, manager: manager && manager.id !== owner?.id ? manager : null }
}

export function displayName(s: Pick<StaffRow, 'name' | 'email'> | null | undefined): string {
  return s ? s.name || s.email.split('@')[0] : 'Unassigned'
}

/** Everyone whose leads and work `me` may see (always includes `me`). */
export function visibleIds(me: StaffUser, dir: StaffRow[]): Set<string> {
  if (me.role === 'admin') return new Set(dir.map((s) => s.id))
  const ids = byId(dir)
  const out = new Set([me.id])
  for (const s of dir) {
    if (me.role === 'manager' && (s.role === 'associate' || s.role === 'ism') && managerOf(s, ids)?.id === me.id) out.add(s.id)
    if (me.role === 'associate' && s.role === 'ism' && s.associate_id === me.id) out.add(s.id)
  }
  return out
}

/** People `me` may give a lead to: themselves and their active team (the admin: anyone active). */
export function assignableIds(me: StaffUser, dir: StaffRow[]): Set<string> {
  const visible = visibleIds(me, dir)
  return new Set(dir.filter((s) => s.active && visible.has(s.id)).map((s) => s.id))
}

/** Whether `me` may manage (edit, move) another staff account. Nobody can manage the admin account. */
export function canManage(me: StaffUser, target: StaffRow, dir: StaffRow[]): boolean {
  if (target.role === 'admin' || target.id === me.id) return false
  if (me.role === 'admin') return true
  if (me.role !== 'manager') return false
  return (target.role === 'associate' || target.role === 'ism') && managerOf(target, byId(dir))?.id === me.id
}

/** Whether `me` may open a lead owned by `ownerId` (null = unassigned: the admin only). */
export function canSeeLead(me: StaffUser, ownerId: string | null, dir: StaffRow[]): boolean {
  if (me.role === 'admin') return true
  return ownerId !== null && visibleIds(me, dir).has(ownerId)
}

/**
 * `canSeeLead`, plus anyone who has an open call or meeting on the lead (e.g. a round-robin ISM hosting another team's
 * learner): they can open it to do that work and log the outcome. Access ends once their task is closed.
 */
export async function mayOpenLead(me: StaffUser, userId: string, ownerId: string | null, dir: StaffRow[]): Promise<boolean> {
  if (canSeeLead(me, ownerId, dir)) return true
  return Boolean(await queryOne(`SELECT 1 FROM lead_tasks WHERE user_id = $1 AND owner_id = $2 AND status = 'open' LIMIT 1`, [userId, me.id]))
}
