import type { PoolClient } from 'pg'
import { query, queryOne, transaction } from './db'
import { BANK, type Track } from './eligibility-bank'
import { INTERESTS } from './questions'
import { saveVersion } from './versions'

// Admin-managed eligibility question sets (Admin → Eligibility test).
// Nothing is ever deleted here: questions and sets are paused instead, and every change is saved as a version.

export type QuestionSet = {
  id: string
  name: string
  description: string | null
  program_area: string
  source: 'ai' | 'bank'
  questions_per_test: number
  seconds_per_question: number
  total_seconds: number
  max_attempts: number
  status: 'active' | 'paused'
  version: number
  created_at: Date
  updated_at: Date
}
export type SetQuestion = {
  id: string
  set_id: string
  position: number
  topic: string
  text: string
  options: string[]
  correct: number
  seconds: number | null
  status: 'active' | 'paused'
}

export const TOPICS = ['Aptitude', 'Full form', 'Concept', 'Tools'] as const
export const AREAS = [{ id: 'any', label: 'All program areas' }, ...INTERESTS.map((i) => ({ id: i.id, label: i.label }))]
export const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? id

// ---------- Global on/off ----------

export async function isEligibilityEnabled(): Promise<boolean> {
  const row = await queryOne<{ value: string }>(`SELECT value FROM app_meta WHERE key = 'eligibility_enabled'`)
  return row?.value !== 'false'
}
export async function setEligibilityEnabled(enabled: boolean) {
  await query(
    `INSERT INTO app_meta (key, value) VALUES ('eligibility_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [enabled ? 'true' : 'false'],
  )
}

// ---------- Snapshots ----------

export async function snapshotSet(db: Pick<PoolClient, 'query'>, setId: string) {
  const set = (await db.query<QuestionSet>(`SELECT * FROM question_sets WHERE id = $1`, [setId])).rows[0]
  const questions = (await db.query<SetQuestion>(`SELECT * FROM set_questions WHERE set_id = $1 ORDER BY position`, [setId])).rows
  return {
    set: {
      name: set.name, description: set.description, program_area: set.program_area, source: set.source, questions_per_test: set.questions_per_test,
      seconds_per_question: set.seconds_per_question, total_seconds: set.total_seconds, max_attempts: set.max_attempts, status: set.status,
    },
    questions: questions.map((q) => ({ id: q.id, position: q.position, topic: q.topic, text: q.text, options: q.options, correct: q.correct, seconds: q.seconds, status: q.status })),
  }
}
export type SetSnapshot = Awaited<ReturnType<typeof snapshotSet>>

/**
 * Runs an admin change inside a transaction, bumps the set's version and saves a snapshot of the result.
 * Every edit therefore leaves a restorable backup.
 */
export async function changeSet<T>(setId: string, by: string, note: string, fn: (db: PoolClient) => Promise<T>): Promise<T> {
  return transaction(async (db) => {
    await db.query(`SELECT id FROM question_sets WHERE id = $1 FOR UPDATE`, [setId])
    const result = await fn(db)
    await db.query(`UPDATE question_sets SET version = version + 1, updated_at = now() WHERE id = $1`, [setId])
    const snap = await snapshotSet(db, setId)
    await saveVersion(db, 'question_set', setId, snap, note, by)
    return result
  })
}

/** Restores a set to an earlier snapshot, as a NEW version. Questions that did not exist then are paused, never deleted. */
export async function restoreSet(setId: string, snap: SetSnapshot, by: string, fromVersion: number | string) {
  await changeSet(setId, by, `Restored from ${typeof fromVersion === 'number' ? `version ${fromVersion}` : fromVersion}`, async (db) => {
    const s = snap.set
    await db.query(
      `UPDATE question_sets SET name = $2, description = $3, program_area = $4, source = $5, questions_per_test = $6, seconds_per_question = $7,
              total_seconds = $8, max_attempts = $9, status = $10 WHERE id = $1`,
      [setId, s.name, s.description, s.program_area, s.source, s.questions_per_test, s.seconds_per_question, s.total_seconds, s.max_attempts, s.status],
    )
    const ids = snap.questions.map((q) => q.id)
    await db.query(`UPDATE set_questions SET status = 'paused', updated_at = now() WHERE set_id = $1 AND NOT (id = ANY($2::uuid[]))`, [setId, ids])
    for (const q of snap.questions) {
      await db.query(
        `INSERT INTO set_questions (id, set_id, position, topic, text, options, correct, seconds, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET set_id = EXCLUDED.set_id, position = EXCLUDED.position, topic = EXCLUDED.topic, text = EXCLUDED.text,
                options = EXCLUDED.options, correct = EXCLUDED.correct, seconds = EXCLUDED.seconds, status = EXCLUDED.status, updated_at = now()`,
        [q.id, setId, q.position, q.topic, q.text, q.options, q.correct, q.seconds, q.status],
      )
    }
  })
}

/** Checks the shape of an uploaded or stored snapshot before restoring it. */
export function validSnapshot(v: unknown): v is SetSnapshot {
  const o = v as SetSnapshot
  return Boolean(o && typeof o === 'object' && o.set && typeof o.set.name === 'string' && Array.isArray(o.questions)
    && o.questions.every((q) => typeof q.id === 'string' && /^[0-9a-f-]{36}$/i.test(q.id) && typeof q.text === 'string' && Array.isArray(q.options) && Number.isInteger(q.correct)))
}

// ---------- Starter sets (copied from the built-in bank once) ----------

const TRACK_NAMES: Record<Exclude<Track, 'aptitude'>, string> = {
  ai: 'AI & GenAI', 'cloud-devops': 'Cloud & DevOps', fde: 'Forward Deployed Engineering', 'data-science': 'Data Science', analytics: 'Data & Business Analytics',
}

const g = globalThis as unknown as { __setsSeeded?: boolean }

export async function ensureQuestionSets(): Promise<void> {
  if (g.__setsSeeded) return
  const seeded = await queryOne(`SELECT 1 FROM app_meta WHERE key = 'question_sets_seeded'`)
  if (seeded) { g.__setsSeeded = true; return }
  await transaction(async (db) => {
    const lock = await db.query(`INSERT INTO app_meta (key, value) VALUES ('question_sets_seeded', 'v1') ON CONFLICT (key) DO NOTHING RETURNING key`)
    if (!lock.rowCount) return
    for (const [track, label] of Object.entries(TRACK_NAMES) as [Exclude<Track, 'aptitude'>, string][]) {
      const set = (await db.query<{ id: string }>(
        `INSERT INTO question_sets (name, description, program_area, source, seed_key) VALUES ($1, $2, $3, 'ai', $4)
         ON CONFLICT (seed_key) DO NOTHING RETURNING id`,
        [`${label} eligibility test`, `Starter set: general aptitude plus easy ${label} basics. Questions are AI-generated for each learner; these questions are the fallback.`, track, `starter-${track}`],
      )).rows[0]
      if (!set) continue
      const questions = [...BANK.filter((b) => b.track === 'aptitude'), ...BANK.filter((b) => b.track === track)]
      let pos = 0
      for (const b of questions) {
        pos += 10
        await db.query(
          `INSERT INTO set_questions (set_id, position, topic, text, options, correct) VALUES ($1, $2, $3, $4, $5, 0)`,
          [set.id, pos, b.track === 'aptitude' ? 'Aptitude' : 'Concept', b.text, b.options],
        )
      }
      await saveVersion(db, 'question_set', set.id, await snapshotSet(db, set.id), 'Starter set created', 'system')
    }
  })
}

// ---------- What a learner gets ----------

/**
 * The set that applies to a learner: an active set for their program area, else an active "all areas" set.
 * Returns null when the admin has hidden the test. One query (the database may be far away).
 */
export async function activeSetFor(interest: string | undefined): Promise<QuestionSet | null> {
  await ensureQuestionSets()
  return queryOne<QuestionSet>(
    `SELECT * FROM question_sets
      WHERE status = 'active' AND program_area IN ($1, 'any')
        AND coalesce((SELECT value FROM app_meta WHERE key = 'eligibility_enabled'), 'true') <> 'false'
      ORDER BY (program_area = $1) DESC, updated_at DESC LIMIT 1`,
    [interest ?? 'any'],
  )
}

export async function activeQuestions(setId: string): Promise<SetQuestion[]> {
  return query<SetQuestion>(`SELECT * FROM set_questions WHERE set_id = $1 AND status = 'active' ORDER BY position`, [setId])
}
