import { query, queryOne } from '../db'
import type { FlowRow, StepRow } from './flows'

const n = (v: unknown) => Number(v ?? 0) || 0

export async function emailOverview() {
  const [stats, flows] = await Promise.all([
    queryOne<Record<string, string>>(
      `SELECT
         (SELECT count(*) FROM email_sends WHERE status = 'sent' AND created_at > now() - interval '7 days') AS sent7,
         (SELECT count(*) FROM email_sends WHERE status = 'sent' AND created_at > now() - interval '30 days') AS sent30,
         (SELECT count(*) FROM email_sends WHERE status = 'failed' AND created_at > now() - interval '30 days') AS failed30,
         (SELECT count(*) FROM email_enrollments WHERE status = 'active') AS active,
         (SELECT count(*) FROM users WHERE marketing_opt_out_at IS NOT NULL) AS unsubscribed,
         (SELECT count(*) FROM users WHERE marketing_opt_out_at > now() - interval '30 days') AS unsub30`,
    ),
    query<FlowRow & { steps: string; active_steps: string; active_enrolled: string; sent30: string; entered30: string; goal_exits: string }>(
      `SELECT f.*,
              (SELECT count(*) FROM email_steps s WHERE s.flow_id = f.id) AS steps,
              (SELECT count(*) FROM email_steps s WHERE s.flow_id = f.id AND s.status = 'active') AS active_steps,
              (SELECT count(*) FROM email_enrollments e WHERE e.flow_id = f.id AND e.status = 'active') AS active_enrolled,
              (SELECT count(*) FROM email_enrollments e WHERE e.flow_id = f.id AND e.enrolled_at > now() - interval '30 days') AS entered30,
              (SELECT count(*) FROM email_enrollments e WHERE e.flow_id = f.id AND e.exit_reason LIKE 'goal:%') AS goal_exits,
              (SELECT count(*) FROM email_sends x WHERE x.flow_id = f.id AND x.status = 'sent' AND x.created_at > now() - interval '30 days') AS sent30
         FROM email_flows f ORDER BY f.created_at`,
    ),
  ])
  return {
    stats: { sent7: n(stats?.sent7), sent30: n(stats?.sent30), failed30: n(stats?.failed30), active: n(stats?.active), unsubscribed: n(stats?.unsubscribed), unsub30: n(stats?.unsub30) },
    flows: flows.map((f) => ({ ...f, steps: n(f.steps), activeSteps: n(f.active_steps), activeEnrolled: n(f.active_enrolled), sent30: n(f.sent30), entered30: n(f.entered30), goalExits: n(f.goal_exits) })),
  }
}

export async function flowDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const flow = await queryOne<FlowRow>(`SELECT * FROM email_flows WHERE id = $1`, [id])
  if (!flow) return null
  const [steps, counts] = await Promise.all([
    query<StepRow>(`SELECT * FROM email_steps WHERE flow_id = $1 ORDER BY position`, [id]),
    query<{ step_id: string; sent: string; skipped: string; failed: string }>(
      `SELECT step_id, count(*) FILTER (WHERE status = 'sent') AS sent, count(*) FILTER (WHERE status = 'skipped') AS skipped,
              count(*) FILTER (WHERE status = 'failed') AS failed
         FROM email_sends WHERE flow_id = $1 AND created_at > now() - interval '30 days' GROUP BY step_id`,
      [id],
    ),
  ])
  const byStep = Object.fromEntries(counts.map((c) => [c.step_id, { sent: n(c.sent), skipped: n(c.skipped), failed: n(c.failed) }]))
  return { flow, steps: steps.map((s) => ({ ...s, stats: byStep[s.id] ?? { sent: 0, skipped: 0, failed: 0 } })) }
}

export async function sendLog(status: string, limit = 200) {
  const allowed = ['sent', 'failed', 'skipped', 'test']
  return query<{ id: number; created_at: Date; to_email: string | null; subject: string | null; status: string; reason: string | null; flow_name: string | null; user_id: string | null }>(
    `SELECT x.id, x.created_at, x.to_email, x.subject, x.status, x.reason, f.name AS flow_name, x.user_id
       FROM email_sends x LEFT JOIN email_flows f ON f.id = x.flow_id
      WHERE ($1 = '' OR x.status = $1)
      ORDER BY x.created_at DESC LIMIT $2`,
    [allowed.includes(status) ? status : '', limit],
  )
}
