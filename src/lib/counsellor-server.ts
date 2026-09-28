import { query, queryOne } from './db'
import { COUNSELLORS, getCounsellor, type CounsellorId } from './counsellors'

export type Allocation = { id: CounsellorId; prev: CounsellorId | null; isNew: boolean }

/**
 * The learner's AI counsellor. The same counsellor continues until the learner ends the chat (or logs out);
 * after that, the next visit gets the next counsellor in round robin across all learners.
 */
export async function allocateCounsellor(userId: string): Promise<Allocation> {
  const current = await queryOne<{ counsellor: string | null; counsellor_prev: string | null; counsellor_active: boolean }>(
    `SELECT counsellor, counsellor_prev, counsellor_active FROM users WHERE id = $1`,
    [userId],
  )
  if (current?.counsellor_active && current.counsellor) {
    return { id: getCounsellor(current.counsellor).id, prev: (current.counsellor_prev as CounsellorId) ?? null, isNew: false }
  }
  // One statement: bump the shared counter, pick the next counsellor, and assign it (only if still unassigned).
  const row = await queryOne<{ counsellor: string; counsellor_prev: string | null; assigned: boolean }>(
    `WITH rr AS (
       INSERT INTO app_meta (key, value) VALUES ('counsellor_rr', '1')
       ON CONFLICT (key) DO UPDATE SET value = ((app_meta.value)::int + 1)::text, updated_at = now()
       RETURNING (value)::int AS n
     ), picked AS (
       SELECT ($2::text[])[1 + ((SELECT n FROM rr) - 1) % array_length($2::text[], 1)] AS id
     ), upd AS (
       UPDATE users u SET counsellor_prev = u.counsellor, counsellor = (SELECT id FROM picked), counsellor_active = true, updated_at = now()
        WHERE u.id = $1 AND NOT u.counsellor_active
       RETURNING u.counsellor, u.counsellor_prev
     )
     SELECT counsellor, counsellor_prev, true AS assigned FROM upd
     UNION ALL
     SELECT counsellor, counsellor_prev, false FROM users WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM upd)`,
    [userId, COUNSELLORS.map((c) => c.id)],
  )
  return {
    id: getCounsellor(row?.counsellor).id,
    prev: row?.counsellor_prev && row.counsellor_prev !== row.counsellor ? (row.counsellor_prev as CounsellorId) : null,
    isNew: Boolean(row?.assigned),
  }
}

/** Ends the chat: the next visit gets a new counsellor. */
export async function endCounsellorChat(userId: string) {
  await query(`UPDATE users SET counsellor_active = false, updated_at = now() WHERE id = $1`, [userId])
}

/** The learner asked for a particular counsellor (usually the previous one): reconnect them. */
export async function switchCounsellor(userId: string, to: CounsellorId): Promise<Allocation | null> {
  const row = await queryOne<{ counsellor: string; counsellor_prev: string | null }>(
    `UPDATE users SET counsellor_prev = CASE WHEN counsellor = $2 THEN counsellor_prev ELSE counsellor END, counsellor = $2, counsellor_active = true, updated_at = now()
      WHERE id = $1 RETURNING counsellor, counsellor_prev`,
    [userId, to],
  )
  return row ? { id: getCounsellor(row.counsellor).id, prev: (row.counsellor_prev as CounsellorId) ?? null, isNew: false } : null
}

export async function counsellorOf(userId: string): Promise<CounsellorId> {
  const row = await queryOne<{ counsellor: string | null }>(`SELECT counsellor FROM users WHERE id = $1`, [userId])
  return getCounsellor(row?.counsellor).id
}
