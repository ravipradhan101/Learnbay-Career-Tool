import type { PoolClient } from 'pg'
import { query, queryOne, transaction } from '../db'
import type { StaffUser } from '../admin-auth'
import { lookupCrm, recordCrmMatch } from './connector'
import { emitLeadEvent } from './webhooks'

type Db = Pick<PoolClient, 'query'>
type Actor = Pick<StaffUser, 'id' | 'role'> | null

/** Records what a staff member (or the system, when actor is null) did on a lead. */
export async function logActivity(db: Db | null, actor: Actor, userId: string, action: string, detail: Record<string, unknown> = {}) {
  const sql = `INSERT INTO lead_activities (user_id, actor_kind, actor_id, action, detail) VALUES ($1, $2, $3, $4, $5)`
  const params = [userId, actor?.role ?? 'system', actor?.id ?? null, action, JSON.stringify(detail)]
  if (db) await db.query(sql, params)
  else await query(sql, params)
}

/**
 * Gives a lead to the next ISM in the rotation: active, not paused, longest since their last lead. Only fills a lead
 * with no owner (never takes a lead from anyone). With no ISM available the lead stays unassigned for the admin.
 * The advisory lock makes concurrent sign-ups take turns, so two leads never land on the same "next" ISM.
 */
async function roundRobin(db: Db, userId: string, by: Actor, fromId: string | null = null): Promise<{ ownerId: string | null; assigned: boolean }> {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext('crm:round-robin'))`)
  const ism = (await db.query<{ id: string }>(
    // Only ISMs who can sign in (an invited ISM joins once they have set their password).
    `SELECT id FROM admin_users WHERE role = 'ism' AND active AND in_rotation AND password_hash IS NOT NULL ORDER BY rr_last_assigned_at ASC NULLS FIRST, created_at LIMIT 1`,
  )).rows[0]
  const saved = await db.query(
    `INSERT INTO lead_owners (user_id, owner_id, source, assigned_by) VALUES ($1, $2, 'round_robin', $3)
     ON CONFLICT (user_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, source = 'round_robin', assigned_by = EXCLUDED.assigned_by, assigned_at = now(), updated_at = now()
      WHERE lead_owners.owner_id IS NULL
     RETURNING user_id`,
    [userId, ism?.id ?? null, by?.id ?? null],
  )
  if (!saved.rowCount) return { ownerId: null, assigned: false }
  if (ism) {
    await db.query(`UPDATE admin_users SET rr_last_assigned_at = clock_timestamp() WHERE id = $1`, [ism.id])
    await db.query(`INSERT INTO lead_assignments (user_id, from_id, to_id, source, by_id) VALUES ($1, $2, $3, 'round_robin', $4)`, [userId, fromId, ism.id, by?.id ?? null])
    await logActivity(db, by, userId, 'allocated', { source: 'round_robin', to: ism.id, ...(fromId ? { from: fromId } : {}) })
  }
  return { ownerId: ism?.id ?? null, assigned: Boolean(ism) }
}

/**
 * Asks the main CRM whether it already has this person (by email or phone) and records the answer. Returns the active
 * staff account it names as owner, if any.
 */
async function crmOwnerFor(userId: string, email: string, phone: string | null): Promise<string | null> {
  const m = await lookupCrm({ email, phone })
  if (!m) return null
  await recordCrmMatch(userId, m).catch((err) => console.error('[crm] record match failed', (err as Error).message))
  if (m.exists) emitLeadEvent('lead.matched', userId, { crmId: m.crmId, matchedBy: m.matchedBy })
  if (!m.ownerEmail) return null
  return (await queryOne<{ id: string }>(`SELECT id FROM admin_users WHERE email = $1 AND active AND role <> 'admin'`, [m.ownerEmail]))?.id ?? null
}

/**
 * A brand-new lead (sign-up). Leads that already have a row are left alone, so this is safe to call more than once.
 * The connected CRM is asked first; if it names an owner who works here, the lead goes to them, otherwise round robin.
 */
export async function allocateNewLead(userId: string, via: 'sign_up' | 'api' = 'sign_up'): Promise<void> {
  if (await queryOne(`SELECT 1 FROM lead_owners WHERE user_id = $1`, [userId])) return
  const u = await queryOne<{ email: string; phone: string | null; name: string | null }>(
    `SELECT email, CASE WHEN phone IS NULL THEN NULL ELSE coalesce(phone_country, '') || phone END AS phone, name FROM users WHERE id = $1`,
    [userId],
  )
  if (!u) return
  const crmOwner = await crmOwnerFor(userId, u.email, u.phone)
  const ownerId = await transaction(async (db) => {
    if (crmOwner) {
      const r = await db.query(`INSERT INTO lead_owners (user_id, owner_id, source) VALUES ($1, $2, 'crm') ON CONFLICT (user_id) DO NOTHING RETURNING user_id`, [userId, crmOwner])
      if (!r.rowCount) return null
      await db.query(`INSERT INTO lead_assignments (user_id, to_id, source) VALUES ($1, $2, 'crm')`, [userId, crmOwner])
      await logActivity(db, null, userId, 'allocated', { source: 'crm', to: crmOwner })
      return crmOwner
    }
    return (await roundRobin(db, userId, null)).ownerId
  })
  emitLeadEvent('lead.created', userId, { via, assigned: ownerId ? (crmOwner ? 'main_crm_owner' : 'round_robin') : 'waiting' })
}

/**
 * A lead created by a staff member. The CRM still wins: if it already has an owner for this person, the lead goes to
 * them (and the caller is told). Otherwise it goes to the person the creator chose (checked by the caller).
 */
export async function claimCreatedLead(me: StaffUser, userId: string, email: string, phone: string, toId: string): Promise<{ ownerId: string; source: 'crm' | 'self' | 'manual' }> {
  const crmOwner = await crmOwnerFor(userId, email, phone)
  const ownerId = crmOwner ?? toId
  const source = crmOwner ? 'crm' : toId === me.id ? 'self' : 'manual'
  await transaction(async (db) => {
    await db.query(
      `INSERT INTO lead_owners (user_id, owner_id, source, created_by, assigned_by) VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (user_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, source = EXCLUDED.source, assigned_by = EXCLUDED.assigned_by, assigned_at = now(), updated_at = now()
        WHERE lead_owners.owner_id IS NULL`,
      [userId, ownerId, source, me.id],
    )
    await db.query(`INSERT INTO lead_assignments (user_id, to_id, source, by_id) VALUES ($1, $2, $3, $4)`, [userId, ownerId, source, me.id])
    await logActivity(db, me, userId, 'lead_created', { to: ownerId, source })
  })
  emitLeadEvent('lead.created', userId, { via: 'staff', assigned: source })
  return { ownerId, source }
}

/**
 * Moves a lead to another owner (the caller has checked both sides are in their scope). Open calls and reminders that
 * are not yet overdue move with it; anything already missed stays charged to the person who missed it.
 */
export async function reassignLead(me: StaffUser, userId: string, toId: string, note = ''): Promise<{ from: string | null }> {
  const from = await transaction(async (db) => {
    const cur = (await db.query<{ owner_id: string | null }>(`SELECT owner_id FROM lead_owners WHERE user_id = $1 FOR UPDATE`, [userId])).rows[0]
    if (cur?.owner_id === toId) return cur.owner_id
    await db.query(
      `INSERT INTO lead_owners (user_id, owner_id, source, assigned_by) VALUES ($1, $2, 'manual', $3)
       ON CONFLICT (user_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, source = 'manual', assigned_by = EXCLUDED.assigned_by, assigned_at = now(), updated_at = now()`,
      [userId, toId, me.id],
    )
    await db.query(
      `UPDATE lead_tasks SET owner_id = $2 WHERE user_id = $1 AND status = 'open' AND kind <> 'meeting' AND (missed_at IS NULL OR missed_at > now())`,
      [userId, toId],
    )
    await db.query(`INSERT INTO lead_assignments (user_id, from_id, to_id, source, by_id, note) VALUES ($1, $2, $3, 'manual', $4, $5)`, [userId, cur?.owner_id ?? null, toId, me.id, note || null])
    await logActivity(db, me, userId, 'reassigned', { from: cur?.owner_id ?? null, to: toId, ...(note ? { note } : {}) })
    return cur?.owner_id ?? null
  })
  emitLeadEvent('lead.assigned', userId, { by: 'staff', reassigned: Boolean(from) })
  return { from }
}

/** Admin: round robin for leads with no owner (older sign-ups, or ones that arrived while no ISM was available). */
export async function distributeUnassigned(me: StaffUser, limit = 200): Promise<{ assigned: number; left: number }> {
  const rows = await query<{ id: string }>(
    `SELECT u.id FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id
      WHERE lo.owner_id IS NULL ORDER BY u.created_at DESC LIMIT $1`,
    [limit],
  )
  let assigned = 0
  for (const r of rows) {
    const done = await transaction((db) => roundRobin(db, r.id, me))
    if (!done.assigned) break
    emitLeadEvent('lead.assigned', r.id, { by: 'round_robin' })
    assigned++
  }
  const left = Number((await queryOne<{ n: string }>(`SELECT count(*) AS n FROM users u LEFT JOIN lead_owners lo ON lo.user_id = u.id WHERE lo.owner_id IS NULL`))?.n ?? 0)
  return { assigned, left }
}

/** Sign-ups since allocation started that have no owner row yet (the sign-up hook failed or timed out). */
export async function allocateMissed(limit = 20): Promise<void> {
  const rows = await query<{ id: string }>(
    `SELECT u.id FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM lead_owners lo WHERE lo.user_id = u.id)
        AND u.created_at >= (SELECT (value #>> '{}')::timestamptz FROM crm_settings WHERE key = 'allocation_started_at')
        AND u.created_at < now() - interval '1 minute'
      ORDER BY u.created_at LIMIT $1`,
    [limit],
  )
  for (const r of rows) await allocateNewLead(r.id).catch((err) => console.error('[crm] allocate failed', (err as Error).message))
}

/**
 * Puts specific leads back through round robin (e.g. when their owner leaves). Returns how many found a new owner.
 * A lead only leaves its owner once an ISM takes it; if no ISM is free, it stays where it was.
 */
export async function rotateLeads(me: StaffUser, userIds: string[]): Promise<number> {
  let n = 0
  for (const id of userIds) {
    const r = await transaction(async (db) => {
      const from = (await db.query<{ owner_id: string | null }>(`SELECT owner_id FROM lead_owners WHERE user_id = $1 FOR UPDATE`, [id])).rows[0]?.owner_id ?? null
      await db.query(`UPDATE lead_owners SET owner_id = NULL WHERE user_id = $1`, [id])
      const rr = await roundRobin(db, id, me, from)
      if (!rr.assigned) await db.query(`UPDATE lead_owners SET owner_id = $2 WHERE user_id = $1`, [id, from])
      return rr
    })
    if (!r.assigned) break
    emitLeadEvent('lead.assigned', id, { by: 'round_robin', reassigned: true })
    await query(`UPDATE lead_tasks SET owner_id = $2 WHERE user_id = $1 AND status = 'open' AND kind <> 'meeting' AND (missed_at IS NULL OR missed_at > now())`, [id, r.ownerId])
    n++
  }
  return n
}
