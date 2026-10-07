import { query, queryOne, transaction } from '../db'
import { env } from '../env'
import type { StaffUser } from '../admin-auth'
import { sendMail } from '../mailer'
import { background } from '../background'
import { cleanText, normalizeEmail } from '../security'
import { reassignLead, rotateLeads } from './allocate'
import { byId, canManage, managerOf, staffDirectory, type StaffRow } from './scope'
import { creatableRoles, ROLE_LABEL, type StaffRole } from './roles'

type Result = { ok: true; id?: string; message?: string } | { ok: false; status: number; error: string }
const fail = (error: string, status = 400): Result => ({ ok: false, status, error })
const isRole = (v: unknown): v is StaffRole => v === 'manager' || v === 'associate' || v === 'ism'
const optId = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null)

export async function audit(actorId: string, targetId: string, action: string, detail: Record<string, unknown> = {}) {
  await query(`INSERT INTO staff_audit (actor_id, target_id, action, detail) VALUES ($1, $2, $3, $4)`, [actorId, targetId, action, JSON.stringify(detail)])
}

/**
 * Checks where a person sits. Returns the manager/associate ids to store, or an error.
 * - associate: under a manager, or independent (no manager)
 * - ISM: under an associate, or mapped straight to a manager, or neither (admin only)
 * A manager can only place people inside their own team.
 */
function placement(me: StaffUser, role: StaffRole, managerIn: string | null, associateIn: string | null, dir: StaffRow[]):
  { manager_id: string | null; associate_id: string | null } | { error: string } {
  const ids = byId(dir)
  const activeOf = (id: string | null, r: StaffRole) => (id ? ids.get(id)?.role === r && ids.get(id)?.active : true)
  if (role === 'manager') return { manager_id: null, associate_id: null }
  if (role === 'associate') {
    const manager = me.role === 'manager' ? me.id : managerIn
    if (!activeOf(manager, 'manager')) return { error: 'Choose an active manager, or leave the associate independent.' }
    return { manager_id: manager, associate_id: null }
  }
  // ISM
  if (associateIn && managerIn) return { error: 'An ISM sits under an associate or directly under a manager, not both.' }
  if (associateIn && !activeOf(associateIn, 'associate')) return { error: 'Choose an active associate.' }
  if (managerIn && !activeOf(managerIn, 'manager')) return { error: 'Choose an active manager.' }
  if (me.role === 'manager') {
    if (associateIn) return managerOf(ids.get(associateIn), ids)?.id === me.id ? { manager_id: null, associate_id: associateIn } : { error: 'You can only place ISMs under associates in your team.' }
    if (managerIn && managerIn !== me.id) return { error: 'You can only place ISMs in your own team.' }
    return { manager_id: me.id, associate_id: null }
  }
  return { manager_id: associateIn ? null : managerIn, associate_id: associateIn }
}

function inviteEmail(to: string, name: string, role: StaffRole, by: string) {
  background('crm:invite', () => sendMail({
    to,
    subject: `You have been added to the Learnbay sales team as ${ROLE_LABEL[role]}`,
    heading: `Welcome${name ? `, ${name.split(' ')[0]}` : ''}`,
    paragraphs: [
      `${by} added you to the Learnbay Career Studio team as ${ROLE_LABEL[role] === 'ISM' ? 'an' : 'a'} ${ROLE_LABEL[role]}.`,
      'To sign in the first time, open the link below, choose “Set or reset password”, and enter the 6-digit code we email you. Nobody else ever sees your password.',
    ],
    cta: { label: 'Set your password', url: `${env.appUrl}/admin/login?next=/admin/crm` },
  }))
}

export async function createStaff(me: StaffUser, b: Record<string, unknown>): Promise<Result> {
  if (!isRole(b.role) || !creatableRoles(me.role).includes(b.role)) return fail('You can’t add that role.', 403)
  const email = normalizeEmail(b.email)
  if (!email) return fail('Enter a valid work email.')
  const name = cleanText(b.name, 80)
  if (name.length < 2) return fail('Enter their full name.')
  const phone = cleanText(b.phone, 20).replace(/[^\d+]/g, '')
  const dir = await staffDirectory()
  if (dir.some((s) => s.email === email)) return fail('Someone with this email is already on the team.', 409)
  const place = placement(me, b.role, optId(b.managerId), optId(b.associateId), dir)
  if ('error' in place) return fail(place.error)
  const team = b.role === 'manager' ? cleanText(b.team, 60) || null : null
  const row = await queryOne<{ id: string }>(
    `INSERT INTO admin_users (email, name, phone, role, team, manager_id, associate_id, created_by, in_rotation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, name, phone || null, b.role, team, place.manager_id, place.associate_id, me.id, b.role === 'ism'],
  )
  if (!row) return fail('Someone with this email is already on the team.', 409)
  await audit(me.id, row.id, 'created', { role: b.role, manager_id: place.manager_id, associate_id: place.associate_id })
  inviteEmail(email, name, b.role, me.role === 'admin' ? 'The admin' : 'Your manager')
  return { ok: true, id: row.id, message: `${name} added. We emailed them how to set a password.` }
}

/**
 * Changes to a staff account. Managers may rename, update phone and move people within their own team. Only the admin
 * changes roles, (de)activates accounts and pauses round robin. Nobody can change the admin account here.
 */
export async function updateStaff(me: StaffUser, targetId: string, b: Record<string, unknown>): Promise<Result> {
  const dir = await staffDirectory()
  const target = dir.find((s) => s.id === targetId)
  if (!target || !canManage(me, target, dir)) return fail('Not found.', 404)
  const isAdmin = me.role === 'admin'
  const changes: Record<string, unknown> = {}
  const set: string[] = []
  const vals: unknown[] = [target.id]
  const put = (col: string, v: unknown) => { vals.push(v); set.push(`${col} = $${vals.length}`); changes[col] = v }
  let signOut = false

  if ('name' in b) {
    const name = cleanText(b.name, 80)
    if (name.length < 2) return fail('Enter their full name.')
    put('name', name)
  }
  if ('phone' in b) put('phone', cleanText(b.phone, 20).replace(/[^\d+]/g, '') || null)
  if ('team' in b && target.role === 'manager') {
    if (!isAdmin) return fail('Only the admin can rename a team.', 403)
    put('team', cleanText(b.team, 60) || null)
  }

  const reports = dir.filter((s) => s.active && (s.manager_id === target.id || s.associate_id === target.id))
  let role: StaffRole = target.role
  if ('role' in b && b.role !== target.role) {
    if (!isAdmin) return fail('Only the admin can change roles.', 403)
    if (!isRole(b.role)) return fail('Choose manager, associate or ISM.')
    if (reports.length) return fail(`Move the ${reports.length} people under ${target.name ?? target.email} first.`)
    role = b.role
    put('role', role)
    signOut = true
  }
  if ('role' in b || 'managerId' in b || 'associateId' in b) {
    // A move names the new spot completely: whichever of manager/associate is not given is cleared.
    const place = placement(me, role, optId(b.managerId), optId(b.associateId), dir)
    if ('error' in place) return fail(place.error)
    if (place.manager_id === target.id || place.associate_id === target.id) return fail('Someone can’t report to themselves.')
    put('manager_id', place.manager_id)
    put('associate_id', place.associate_id)
  }
  if ('inRotation' in b) {
    if (!isAdmin) return fail('Only the admin can pause round robin.', 403)
    if (role !== 'ism') return fail('Only ISMs are in the round robin.')
    put('in_rotation', b.inRotation === true)
  }
  if ('active' in b && (b.active === true) !== target.active) {
    if (!isAdmin) return fail('Only the admin can deactivate or reactivate accounts.', 403)
    if (b.active !== true && reports.length) return fail(`Move the ${reports.length} people under ${target.name ?? target.email} first.`)
    put('active', b.active === true)
    signOut = b.active !== true
  }
  if (!set.length) return { ok: true, message: 'Nothing to change.' }

  try {
    await transaction(async (db) => {
      await db.query(`UPDATE admin_users SET ${set.join(', ')} WHERE id = $1`, vals)
      if (signOut) await db.query(`DELETE FROM admin_sessions WHERE admin_id = $1`, [target.id])
    })
  } catch (err) {
    console.error('[crm] staff update failed', (err as Error).message)
    return fail('That change is not allowed.')
  }
  await audit(me.id, target.id, 'updated', changes)

  // Leads of someone who leaves: to a named person, or back through round robin.
  if (changes.active === false && b.moveLeadsTo) {
    const leads = await query<{ user_id: string }>(`SELECT user_id FROM lead_owners WHERE owner_id = $1 AND status NOT IN ('enrolled', 'lost')`, [target.id])
    if (b.moveLeadsTo === 'round_robin') {
      const n = await rotateLeads(me, leads.map((l) => l.user_id))
      await audit(me.id, target.id, 'leads_moved', { to: 'round_robin', count: n })
    } else {
      const to = optId(b.moveLeadsTo)
      const dest = to ? dir.find((s) => s.id === to && s.active && s.role !== 'admin') ?? (to === me.id ? dir.find((s) => s.id === me.id) : undefined) : undefined
      if (dest) {
        for (const l of leads) await reassignLead(me, l.user_id, dest.id, `${target.name ?? target.email} left the team`)
        await audit(me.id, target.id, 'leads_moved', { to: dest.id, count: leads.length })
      }
    }
  }
  return { ok: true, message: 'Saved.' }
}
