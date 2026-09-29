import { background } from '../background'
import { env } from '../env'
import { query, queryOne, transaction } from '../db'
import { sendMail, type Mail } from '../mailer'
import { hmac, safeEqualHex } from '../security'
import { linkSig } from '../links'
import { isCondition, type ConditionId, type TriggerId } from './catalog'
import { checkCondition, loadContext, mergeVars, type LearnerContext } from './context'
import { DEFAULT_FLOWS } from './defaults'
import { fillTags, renderBody, slug, trackedUrl, type MergeVars } from './render'

export type FlowRow = {
  id: string
  name: string
  description: string | null
  trigger: TriggerId
  status: 'active' | 'paused'
  reentry_days: number
  exit_on: string[]
  seed_key: string | null
  created_at: Date
  updated_at: Date
}
export type StepRow = {
  id: string
  flow_id: string
  position: number
  delay_minutes: number
  conditions: string[]
  subject: string
  preheader: string | null
  heading: string
  body: string
  cta_label: string | null
  cta_path: string | null
  status: 'active' | 'paused'
}

// ---------- Deliverability guard rails ----------
// Every automated email after the first (delay > 0) respects these, whatever the flow settings say.
const MIN_GAP_HOURS = Number(process.env.EMAIL_MIN_GAP_HOURS ?? '20') || 20 // at most ~1 nurture email a day per learner
const SEND_FROM_HOUR_IST = 9
const SEND_UNTIL_HOUR_IST = 20
const MAX_PER_TICK = Math.max(1, Number(process.env.EMAIL_MAX_PER_TICK ?? '40') || 40) // paces sending so SMTP limits aren't hit

// ---------- Unsubscribe links ----------

export function unsubscribeToken(userId: string): string {
  return hmac(`unsubscribe:${userId}`)
}
export function unsubscribeUrl(userId: string): string {
  return `${env.appUrl}/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`
}
export function validUnsubscribe(userId: unknown, token: unknown): userId is string {
  return typeof userId === 'string' && /^[0-9a-f-]{36}$/i.test(userId) && typeof token === 'string' && /^[0-9a-f]{64}$/.test(token)
    && safeEqualHex(token, unsubscribeToken(userId))
}

// ---------- Rendering ----------

export function buildMail(step: Pick<StepRow, 'subject' | 'preheader' | 'heading' | 'body' | 'cta_label' | 'cta_path' | 'position'>, flowName: string, vars: MergeVars, to: string, unsubscribe?: string, userId?: string): Mail {
  const body = renderBody(step.body, vars)
  const ctaPath = step.cta_path ? fillTags(step.cta_path, vars) : ''
  return {
    to,
    subject: fillTags(step.subject, vars).trim(),
    preheader: step.preheader ? fillTags(step.preheader, vars).trim() : undefined,
    heading: fillTags(step.heading, vars).trim(),
    paragraphs: [],
    bodyHtml: body.html,
    bodyText: body.text,
    cta: step.cta_label && ctaPath.startsWith('/')
      ? { label: fillTags(step.cta_label, vars).trim(), url: trackedUrl(env.appUrl, ctaPath, slug(flowName), `step-${step.position}`, userId ? linkSig(userId) : undefined) }
      : undefined,
    unsubscribeUrl: unsubscribe,
  }
}

// ---------- Enrolment ----------

/**
 * Starts every active flow for this trigger, unless the learner is already in it, or went through it
 * recently (re-entry window; 0 = only ever once). Never slows the request that caused it, but always completes
 * (on serverless hosts too: see `background`).
 */
export function triggerFlows(userId: string, trigger: TriggerId): void {
  background(`email:${trigger}`, () => enrol(userId, trigger))
}

async function enrol(userId: string, trigger: TriggerId) {
  const rows = await query<{ due: number }>(
    `INSERT INTO email_enrollments (flow_id, user_id, next_run_at)
     SELECT f.id, $1, now() + make_interval(mins => first.delay_minutes)
       FROM email_flows f
       CROSS JOIN LATERAL (SELECT delay_minutes FROM email_steps s WHERE s.flow_id = f.id AND s.status = 'active' ORDER BY position LIMIT 1) first
      WHERE f.trigger = $2 AND f.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM email_enrollments e
           WHERE e.flow_id = f.id AND e.user_id = $1
             AND (e.status = 'active' OR f.reentry_days = 0 OR e.enrolled_at > now() - make_interval(days => f.reentry_days)))
     ON CONFLICT (flow_id, user_id) WHERE status = 'active' DO NOTHING
     RETURNING (next_run_at <= now() + interval '1 minute')::int AS due`,
    [userId, trigger],
  )
  // Welcome-style emails (no delay) go out right away instead of waiting for the next run.
  if (rows.some((r) => r.due)) await processDueEmails()
}

// ---------- The worker ----------

type Claimed = { id: number; flow_id: string; user_id: string; last_position: number; next_run_at: Date }

const IST_OFFSET_MS = 330 * 60_000

/** Next allowed send time: at least MIN_GAP_HOURS after the last nurture email, and inside 9am-8pm IST. */
function allowedTime(lastSent: Date | null): Date | null {
  let t = new Date(Math.max(Date.now(), lastSent ? lastSent.getTime() + MIN_GAP_HOURS * 3_600_000 : 0))
  const ist = new Date(t.getTime() + IST_OFFSET_MS)
  const hour = ist.getUTCHours()
  if (hour < SEND_FROM_HOUR_IST || hour >= SEND_UNTIL_HOUR_IST) {
    const next = new Date(ist)
    if (hour >= SEND_UNTIL_HOUR_IST) next.setUTCDate(next.getUTCDate() + 1)
    next.setUTCHours(SEND_FROM_HOUR_IST, Math.floor(Math.random() * 45), 0, 0) // spread the morning batch over 45 minutes
    t = new Date(next.getTime() - IST_OFFSET_MS)
  }
  return t.getTime() > Date.now() + 30_000 ? t : null
}

async function finish(e: Claimed, status: 'completed' | 'exited', reason: string | null, lastPosition = e.last_position) {
  await query(
    `UPDATE email_enrollments SET status = $2, exit_reason = $3, last_position = $4, finished_at = now(), locked_until = NULL WHERE id = $1`,
    [e.id, status, reason, lastPosition],
  )
}

async function logSend(userId: string | null, flowId: string | null, stepId: string | null, to: string | null, subject: string | null, status: string, reason: string | null) {
  await query(
    `INSERT INTO email_sends (user_id, flow_id, step_id, to_email, subject, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, flowId, stepId, to, subject?.slice(0, 300) ?? null, status, reason?.slice(0, 300) ?? null],
  )
}

async function processOne(e: Claimed, flows: Map<string, { flow: FlowRow; steps: StepRow[] }>): Promise<'sent' | 'skipped' | 'failed' | 'waiting' | 'done'> {
  let entry = flows.get(e.flow_id)
  if (!entry) {
    const flow = await queryOne<FlowRow>(`SELECT * FROM email_flows WHERE id = $1`, [e.flow_id])
    const steps = flow ? await query<StepRow>(`SELECT * FROM email_steps WHERE flow_id = $1 ORDER BY position`, [e.flow_id]) : []
    if (!flow) { await finish(e, 'exited', 'flow_deleted'); return 'done' }
    entry = { flow, steps }
    flows.set(e.flow_id, entry)
  }
  const { flow, steps } = entry
  const ctx = await loadContext(e.user_id)
  if (!ctx) { await finish(e, 'exited', 'user_deleted'); return 'done' }
  if (ctx.optedOut) { await finish(e, 'exited', 'unsubscribed'); return 'done' }
  const goal = flow.exit_on.filter(isCondition).find((c) => checkCondition(c, ctx))
  if (goal) { await finish(e, 'exited', `goal:${goal}`); return 'done' }

  const step = steps.find((s) => s.position > e.last_position && s.status === 'active')
  if (!step) { await finish(e, 'completed', null); return 'done' }

  if (step.delay_minutes > 0) {
    const last = await queryOne<{ at: Date | null }>(`SELECT max(created_at) AS at FROM email_sends WHERE user_id = $1 AND status = 'sent' AND flow_id IS NOT NULL`, [ctx.userId])
    const wait = allowedTime(last?.at ?? null)
    if (wait) {
      await query(`UPDATE email_enrollments SET next_run_at = $2, locked_until = NULL WHERE id = $1`, [e.id, wait])
      return 'waiting'
    }
  }

  const conditions = step.conditions.filter(isCondition) as ConditionId[]
  const eligible = conditions.every((c) => checkCondition(c, ctx))
  let outcome: 'sent' | 'skipped' | 'failed' = 'skipped'
  if (!eligible) {
    await logSend(ctx.userId, flow.id, step.id, ctx.email, step.subject, 'skipped', `conditions not met: ${conditions.filter((c) => !checkCondition(c, ctx)).join(', ')}`)
  } else {
    const mail = buildMail(step, flow.name, mergeVars(ctx), ctx.email, unsubscribeUrl(ctx.userId), ctx.userId)
    try {
      await sendMail(mail)
      await logSend(ctx.userId, flow.id, step.id, ctx.email, mail.subject, 'sent', null)
      outcome = 'sent'
    } catch (err) {
      await logSend(ctx.userId, flow.id, step.id, ctx.email, mail.subject, 'failed', (err as Error).message)
      outcome = 'failed'
    }
  }

  // Schedule the following step relative to when this one was due, so the flow keeps its rhythm.
  const following = steps.find((s) => s.position > step.position && s.status === 'active')
  if (!following) {
    await finish(e, 'completed', null, step.position)
  } else {
    const base = Math.max(new Date(e.next_run_at).getTime(), outcome === 'sent' ? Date.now() - 60_000 : 0)
    await query(
      `UPDATE email_enrollments SET last_position = $2, next_run_at = $3, locked_until = NULL WHERE id = $1`,
      [e.id, step.position, new Date(base + following.delay_minutes * 60_000)],
    )
  }
  return outcome
}

const g = globalThis as unknown as { __emailRunning?: boolean }

/** Sends everything that is due. Safe to run from several servers at once (rows are claimed with SKIP LOCKED). */
export async function processDueEmails(limit = MAX_PER_TICK): Promise<{ sent: number; skipped: number; failed: number; waiting: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0, waiting: 0 }
  if (g.__emailRunning) return stats
  g.__emailRunning = true
  try {
    const claimed = await query<Claimed>(
      `UPDATE email_enrollments SET locked_until = now() + interval '5 minutes'
        WHERE id IN (
          SELECT e.id FROM email_enrollments e JOIN email_flows f ON f.id = e.flow_id
           WHERE e.status = 'active' AND f.status = 'active' AND e.next_run_at <= now()
             AND (e.locked_until IS NULL OR e.locked_until < now())
           ORDER BY e.next_run_at LIMIT $1
           FOR UPDATE OF e SKIP LOCKED)
       RETURNING id, flow_id, user_id, last_position, next_run_at`,
      [limit],
    )
    const flows = new Map<string, { flow: FlowRow; steps: StepRow[] }>()
    for (const e of claimed) {
      try {
        const r = await processOne(e, flows)
        if (r !== 'done') stats[r]++
      } catch (err) {
        console.error('[email] enrollment', e.id, (err as Error).message)
        await query(`UPDATE email_enrollments SET locked_until = now() + interval '30 minutes' WHERE id = $1`, [e.id]).catch(() => {})
      }
    }
    if (claimed.length) console.info(`[email] run: ${JSON.stringify(stats)}`)
  } finally {
    g.__emailRunning = false
  }
  return stats
}

// ---------- Default flows (created once; after that, admins own them) ----------

export async function ensureDefaultFlows(): Promise<void> {
  const seeded = await queryOne(`SELECT 1 FROM app_meta WHERE key = 'email_flows_seeded'`)
  if (seeded) return
  await transaction(async (db) => {
    const lock = await db.query(`INSERT INTO app_meta (key, value) VALUES ('email_flows_seeded', 'v1') ON CONFLICT (key) DO NOTHING RETURNING key`)
    if (!lock.rowCount) return
    for (const f of DEFAULT_FLOWS) {
      const flow = await db.query<{ id: string }>(
        `INSERT INTO email_flows (name, description, trigger, reentry_days, exit_on, seed_key) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (seed_key) DO NOTHING RETURNING id`,
        [f.name, f.description, f.trigger, f.reentryDays, f.exitOn, f.key],
      )
      const flowId = flow.rows[0]?.id
      if (!flowId) continue
      let position = 0
      for (const s of f.steps) {
        position += 10
        await db.query(
          `INSERT INTO email_steps (flow_id, position, delay_minutes, conditions, subject, preheader, heading, body, cta_label, cta_path)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [flowId, position, s.delayMinutes, s.conditions, s.subject, s.preheader, s.heading, s.body, s.ctaLabel, s.ctaPath],
        )
      }
    }
  })
}

export async function sendTestEmail(step: StepRow, flowName: string, to: string, vars: MergeVars) {
  const mail = buildMail(step, flowName, vars, to, `${env.appUrl}/unsubscribe`)
  mail.subject = `[TEST] ${mail.subject}`
  await sendMail(mail)
  await logSend(null, step.flow_id, step.id, to, mail.subject, 'test', null)
}

export type { LearnerContext }
