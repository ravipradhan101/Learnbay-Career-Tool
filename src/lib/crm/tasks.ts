import { query } from '../db'
import { allocateMissed } from './allocate'

/** Calls are made 10 AM to 8 PM IST. India has no daylight saving, so IST is always UTC+5:30. */
const DAY_START = 10 * 60
const DAY_END = 20 * 60
const IST_OFFSET = 330
/** A call request must be returned within 1 working day: 10 calling hours. */
export const CALL_REQUEST_HOURS = 10
/** A booked call is missed if no outcome is logged within this long after the slot starts. */
export const BOOKED_GRACE_MINUTES = 60

/** `from` plus `hours` of calling time (10 AM to 8 PM IST), e.g. a request at 9 PM is due by 8 PM the next day. */
export function addWorkingHours(from: Date, hours = CALL_REQUEST_HOURS): Date {
  let t = Math.floor(from.getTime() / 60_000)
  let left = hours * 60
  for (let guard = 0; guard < 400; guard++) {
    const m = (((t + IST_OFFSET) % 1440) + 1440) % 1440
    if (m < DAY_START) { t += DAY_START - m; continue }
    if (m >= DAY_END) { t += 1440 - m + DAY_START; continue }
    const room = DAY_END - m
    if (left <= room) return new Date((t + left) * 60_000)
    left -= room
    t += 1440 - m + DAY_START
  }
  return new Date((t + left) * 60_000)
}

/**
 * SQL: is task `t` a missed call? (still open after its deadline, or closed only after it). A call attempt logged in
 * time ("No answer", "Busy") counts as attended to, even though the call stays open for another try.
 */
export const MISSED_SQL = `(t.kind IN ('call_booked', 'call_request', 'meeting') AND t.missed_at IS NOT NULL AND t.status <> 'cancelled'
  AND ((t.status = 'open' AND t.missed_at < now()) OR (t.status = 'done' AND t.completed_at > t.missed_at))
  AND NOT EXISTS (SELECT 1 FROM lead_activities la WHERE la.user_id = t.user_id AND la.action = 'call_logged'
                  AND la.detail->>'task' = t.id::text AND la.created_at <= t.missed_at))`

/**
 * SQL: who works a call for the lead owner `owner` (a column or expression): the owner, or, if their account has been
 * deactivated, their ABM, then their BM, then the admin. NULL when the lead has no owner.
 */
const WORKER = (owner: string) => `(SELECT coalesce(
    CASE WHEN o.active THEN o.id END,
    (SELECT x.id FROM admin_users x WHERE x.id = o.associate_id AND x.active),
    (SELECT x.id FROM admin_users x WHERE x.active AND x.id = coalesce(o.manager_id, (SELECT y.manager_id FROM admin_users y WHERE y.id = o.associate_id))),
    (SELECT x.id FROM admin_users x WHERE x.role = 'admin' AND x.active ORDER BY x.created_at LIMIT 1))
  FROM admin_users o WHERE o.id = ${owner})`

let lastSync = 0

/**
 * Keeps calls in step with the learner side without touching it: booked calls and call requests become tasks for the
 * lead's owner, a rescheduled booking moves its task, and sign-ups the hook missed are allocated. Runs when staff open
 * the CRM (at most every 20 seconds per server) and from the daily cron.
 */
export async function syncTasks(force = false): Promise<void> {
  if (!force && Date.now() - lastSync < 20_000) return
  lastSync = Date.now()
  try {
    await allocateMissed()
    // A call that was already missed when the learner moved it stays on record as missed (closed, detached), and
    // the new slot gets a fresh task below.
    await query(
      `UPDATE lead_tasks t SET source_id = NULL, status = 'done', outcome = 'rescheduled', outcome_note = 'The learner moved this call after it was missed.', completed_at = now()
         FROM counsellor_requests cr
        WHERE t.kind = 'call_booked' AND t.source_id = cr.id AND t.status = 'open' AND t.missed_at < now()
          AND ((cr.preferred_date::text || ' ' || cr.preferred_time)::timestamp AT TIME ZONE 'Asia/Kolkata') <> t.due_at`,
    )
    // A call already done stays on record as it was when the learner books a new time; the new slot gets its own task.
    await query(
      `UPDATE lead_tasks t SET source_id = NULL
         FROM counsellor_requests cr
        WHERE t.kind = 'call_booked' AND t.source_id = cr.id AND t.status <> 'open'
          AND cr.preferred_date IS NOT NULL AND cr.preferred_time ~ '^[0-9]{1,2}:[0-9]{2} (AM|PM)$'
          AND ((cr.preferred_date::text || ' ' || cr.preferred_time)::timestamp AT TIME ZONE 'Asia/Kolkata') <> t.due_at`,
    )
    // Booked calls (only slots from when allocation started, so old bookings never show up as missed).
    await query(
      `WITH b AS (
         SELECT cr.id, cr.user_id, ((cr.preferred_date::text || ' ' || cr.preferred_time)::timestamp AT TIME ZONE 'Asia/Kolkata') AS slot
           FROM counsellor_requests cr
          WHERE cr.preferred_date IS NOT NULL AND cr.preferred_time ~ '^[0-9]{1,2}:[0-9]{2} (AM|PM)$'
            AND cr.preferred_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date - 30
       )
       INSERT INTO lead_tasks (user_id, owner_id, kind, title, due_at, missed_at, source_id)
       SELECT b.user_id, ${WORKER('lo.owner_id')}, 'call_booked', 'Counselling call (booked by the learner)', b.slot, b.slot + make_interval(mins => $1), b.id
         FROM b LEFT JOIN lead_owners lo ON lo.user_id = b.user_id
        WHERE b.slot >= (SELECT (value #>> '{}')::timestamptz FROM crm_settings WHERE key = 'allocation_started_at')
       ON CONFLICT (kind, source_id) DO UPDATE SET due_at = EXCLUDED.due_at, missed_at = EXCLUDED.missed_at, status = 'open',
              outcome = NULL, outcome_note = NULL, completed_at = NULL, completed_by = NULL,
              owner_id = coalesce(${WORKER('(SELECT owner_id FROM lead_owners WHERE user_id = lead_tasks.user_id)')}, lead_tasks.owner_id)
        WHERE lead_tasks.due_at IS DISTINCT FROM EXCLUDED.due_at AND lead_tasks.status = 'open'`,
      [BOOKED_GRACE_MINUTES],
    )
    // Call requests ("call me"), due within 1 working day.
    const requests = await query<{ id: string; user_id: string; created_at: Date; owner_id: string | null }>(
      `SELECT c.id, c.user_id, c.created_at, ${WORKER('lo.owner_id')} AS owner_id FROM call_requests c LEFT JOIN lead_owners lo ON lo.user_id = c.user_id
        WHERE c.user_id IS NOT NULL
          AND c.created_at >= (SELECT (value #>> '{}')::timestamptz FROM crm_settings WHERE key = 'allocation_started_at')
          AND NOT EXISTS (SELECT 1 FROM lead_tasks t WHERE t.kind = 'call_request' AND t.source_id = c.id)
        LIMIT 200`,
    )
    for (const r of requests) {
      const due = addWorkingHours(new Date(r.created_at))
      await query(
        `INSERT INTO lead_tasks (user_id, owner_id, kind, title, due_at, missed_at, source_id, created_at)
         VALUES ($1, $2, 'call_request', 'Call back: the learner asked for a call', $3, $3, $4, $5) ON CONFLICT (kind, source_id) DO NOTHING`,
        [r.user_id, r.owner_id, due, r.id, r.created_at],
      )
    }
    // Calls that arrived before the lead had an owner go to the owner once there is one (not ones already missed:
    // those stay unassigned on record rather than counting against someone who never had them).
    await query(
      `UPDATE lead_tasks t SET owner_id = w.worker FROM (
         SELECT t2.id, ${WORKER('lo.owner_id')} AS worker FROM lead_tasks t2 JOIN lead_owners lo ON lo.user_id = t2.user_id
          WHERE t2.owner_id IS NULL AND t2.status = 'open' AND lo.owner_id IS NOT NULL AND (t2.missed_at IS NULL OR t2.missed_at > now())
       ) w WHERE w.id = t.id AND w.worker IS NOT NULL`,
    )
    // Open calls and reminders of someone whose account was deactivated go to the person above them, so nothing waits
    // on an account nobody uses (meetings are moved or cancelled before deactivation).
    await query(
      `UPDATE lead_tasks t SET owner_id = w.worker FROM (
         SELECT t2.id, ${WORKER('t2.owner_id')} AS worker FROM lead_tasks t2 JOIN admin_users a ON a.id = t2.owner_id AND NOT a.active
          WHERE t2.status = 'open' AND t2.kind <> 'meeting' AND (t2.missed_at IS NULL OR t2.missed_at > now())
       ) w WHERE w.id = t.id AND w.worker IS NOT NULL AND w.worker <> t.owner_id`,
    )
  } catch (err) {
    console.error('[crm] task sync failed', (err as Error).message)
  }
}
