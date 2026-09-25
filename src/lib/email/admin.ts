import { getCurrentAdmin, type AdminUser } from '../admin-auth'
import { query, queryOne, transaction } from '../db'
import { cleanText, isSameOrigin, jsonError, readJson } from '../security'
import { saveVersion } from '../versions'
import { EXIT_CONDITIONS, isCondition, isTrigger, isValidCtaPath, type ConditionId, type TriggerId } from './catalog'

/** Every admin email API call: same-origin + signed-in admin. Returns the admin, or an error response to send back. */
export async function adminGuard(request: Request, write = true): Promise<AdminUser | Response> {
  if (write && !isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const admin = await getCurrentAdmin()
  if (!admin) return jsonError(401, 'Please sign in to the admin area again.')
  return admin
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  return (await readJson<Record<string, unknown>>(request, 40_000)) ?? {}
}

/** Keeps line breaks (for email bodies) but strips control characters. */
function cleanMultiline(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}

export type FlowInput = { name: string; description: string; trigger: TriggerId; reentryDays: number; exitOn: ConditionId[] }

export function parseFlow(b: Record<string, unknown>, partial = false): { value?: Partial<FlowInput>; error?: string } {
  const out: Partial<FlowInput> = {}
  if (!partial || 'name' in b) {
    const name = cleanText(b.name, 80)
    if (name.length < 3) return { error: 'Give the flow a name (at least 3 characters).' }
    out.name = name
  }
  if ('description' in b) out.description = cleanText(b.description, 300)
  if (!partial || 'trigger' in b) {
    if (!isTrigger(b.trigger)) return { error: 'Choose what starts this flow.' }
    out.trigger = b.trigger
  }
  if ('reentryDays' in b) {
    const d = Number(b.reentryDays)
    if (!Number.isInteger(d) || d < 0 || d > 365) return { error: 'Re-entry must be between 0 and 365 days.' }
    out.reentryDays = d
  }
  if ('exitOn' in b) {
    if (!Array.isArray(b.exitOn)) return { error: 'Invalid exit conditions.' }
    out.exitOn = [...new Set(b.exitOn.filter((c): c is ConditionId => isCondition(c) && EXIT_CONDITIONS.includes(c)))]
  }
  return { value: out }
}

export type StepInput = {
  delayMinutes: number; conditions: ConditionId[]; subject: string; preheader: string; heading: string; body: string; ctaLabel: string; ctaPath: string
}

export function parseStep(b: Record<string, unknown>): { value?: StepInput; error?: string } {
  const delay = Number(b.delayMinutes)
  if (!Number.isInteger(delay) || delay < 0 || delay > 60 * 24 * 90) return { error: 'The delay must be between 0 minutes and 90 days.' }
  const conditions = Array.isArray(b.conditions) ? [...new Set(b.conditions.filter(isCondition))] : []
  const subject = cleanText(b.subject, 150)
  const heading = cleanText(b.heading, 150)
  const text = cleanMultiline(b.body, 5000)
  if (subject.length < 3) return { error: 'Add a subject line.' }
  if (heading.length < 3) return { error: 'Add a heading.' }
  if (text.length < 10) return { error: 'Write the email body.' }
  const ctaLabel = cleanText(b.ctaLabel, 60)
  const ctaPath = cleanText(b.ctaPath, 120)
  if (ctaLabel && !ctaPath) return { error: 'Choose where the button links to.' }
  if (ctaPath && !isValidCtaPath(ctaPath)) return { error: 'Button links must be a page in the app, like /dashboard/sessions.' }
  return { value: { delayMinutes: delay, conditions, subject, preheader: cleanText(b.preheader, 150), heading, body: text, ctaLabel, ctaPath: ctaLabel ? ctaPath : '' } }
}

export const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

// ---------- Version history (backups) for flows ----------

export type FlowSnapshot = {
  flow: { name: string; description: string | null; trigger: string; status: string; reentry_days: number; exit_on: string[] }
  steps: { id: string; position: number; delay_minutes: number; conditions: string[]; subject: string; preheader: string | null; heading: string; body: string; cta_label: string | null; cta_path: string | null; status: string }[]
}

export async function snapshotFlow(flowId: string): Promise<FlowSnapshot | null> {
  const flow = await queryOne<FlowSnapshot['flow']>(`SELECT name, description, trigger, status, reentry_days, exit_on FROM email_flows WHERE id = $1`, [flowId])
  if (!flow) return null
  const steps = await query<FlowSnapshot['steps'][number]>(
    `SELECT id, position, delay_minutes, conditions, subject, preheader, heading, body, cta_label, cta_path, status FROM email_steps WHERE flow_id = $1 ORDER BY position`,
    [flowId],
  )
  return { flow, steps }
}

/** Saves the flow as it is now. Call after every change (and just before a delete). */
export async function saveFlowVersion(flowId: string, note: string, by: string) {
  const snap = await snapshotFlow(flowId)
  if (snap) await saveVersion(null, 'email_flow', flowId, snap, note, by)
}

export function validFlowSnapshot(v: unknown): v is FlowSnapshot {
  const o = v as FlowSnapshot
  return Boolean(o && o.flow && typeof o.flow.name === 'string' && isTrigger(o.flow.trigger) && Array.isArray(o.steps)
    && o.steps.every((s) => typeof s.id === 'string' && /^[0-9a-f-]{36}$/i.test(s.id) && typeof s.subject === 'string' && typeof s.body === 'string' && Number.isInteger(s.position)))
}

/**
 * Puts a flow back exactly as it was in a snapshot, re-creating it if it was deleted. A re-created flow comes back
 * paused, so nothing is sent until an admin checks it and switches it on.
 */
export async function restoreFlow(flowId: string, snap: FlowSnapshot, by: string, from: string) {
  await transaction(async (db) => {
    const f = snap.flow
    const existed = (await db.query(`SELECT 1 FROM email_flows WHERE id = $1 FOR UPDATE`, [flowId])).rowCount
    await db.query(
      `INSERT INTO email_flows (id, name, description, trigger, status, reentry_days, exit_on) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, trigger = EXCLUDED.trigger, status = EXCLUDED.status,
              reentry_days = EXCLUDED.reentry_days, exit_on = EXCLUDED.exit_on, updated_at = now()`,
      [flowId, f.name, f.description, f.trigger, existed ? f.status : 'paused', f.reentry_days, f.exit_on.filter(isCondition)],
    )
    await db.query(`DELETE FROM email_steps WHERE flow_id = $1 AND NOT (id = ANY($2::uuid[]))`, [flowId, snap.steps.map((s) => s.id)])
    for (const s of snap.steps) {
      await db.query(
        `INSERT INTO email_steps (id, flow_id, position, delay_minutes, conditions, subject, preheader, heading, body, cta_label, cta_path, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET flow_id = EXCLUDED.flow_id, position = EXCLUDED.position, delay_minutes = EXCLUDED.delay_minutes, conditions = EXCLUDED.conditions,
                subject = EXCLUDED.subject, preheader = EXCLUDED.preheader, heading = EXCLUDED.heading, body = EXCLUDED.body, cta_label = EXCLUDED.cta_label,
                cta_path = EXCLUDED.cta_path, status = EXCLUDED.status, updated_at = now()`,
        [s.id, flowId, s.position, s.delay_minutes, s.conditions.filter(isCondition), s.subject, s.preheader, s.heading, s.body, s.cta_label,
          s.cta_path && isValidCtaPath(s.cta_path) ? s.cta_path : null, s.status === 'paused' ? 'paused' : 'active'],
      )
    }
  })
  await saveFlowVersion(flowId, `Restored from ${from}`, by)
}

/** Flows created before version history existed get a first backup, so they can always be rolled back. */
export async function ensureFlowBaselines() {
  const missing = await query<{ id: string }>(
    `SELECT f.id FROM email_flows f WHERE NOT EXISTS (SELECT 1 FROM content_versions v WHERE v.entity_type = 'email_flow' AND v.entity_id = f.id)`,
  )
  for (const f of missing) await saveFlowVersion(f.id, 'Initial version (backup)', 'system')
}
