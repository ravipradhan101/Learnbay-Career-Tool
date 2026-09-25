// Rebuilds admin-managed content from a file made by `npm run backup`.
// Usage: npm run restore -- backups/content-20260925-1030.json [--dry-run]
// --dry-run performs the whole restore inside a transaction and then rolls it back, to check a file safely.
//
// Safe by design: it only inserts or updates, never deletes. Question sets, questions, email flows and emails
// in the file are put back as they were in the backup; anything created after the backup is left alone.
// Version history from the file is merged in, and each restored set/flow gets a new "Restored from backup file"
// version, so the restore itself can be rolled back from the admin screens.
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const file = process.argv.slice(2).find((a) => !a.startsWith('--'))
const dryRun = process.argv.includes('--dry-run')
if (!file) { console.error('Usage: npm run restore -- <backup file>'); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(1) }
const data = JSON.parse(await readFile(file, 'utf8'))
if (data?.type !== 'learnbay-career-studio-content-backup' || !data.tables) { console.error('This is not a Career Studio content backup.'); process.exit(1) }

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})

/** Upserts rows by primary key, using only columns that exist in both the backup and the current table. */
async function upsert(table, key, rows) {
  if (!rows?.length) return 0
  const cols = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table])).rows.map((r) => r.column_name)
  let n = 0
  for (const row of rows) {
    const use = cols.filter((c) => c in row)
    const values = use.map((c) => (row[c] !== null && typeof row[c] === 'object' && !Array.isArray(row[c]) && !(row[c] instanceof Date) ? JSON.stringify(row[c]) : row[c]))
    const updates = use.filter((c) => !key.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(', ')
    await client.query(
      `INSERT INTO ${table} (${use.join(', ')}) VALUES (${use.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (${key.join(', ')}) DO ${updates ? `UPDATE SET ${updates}` : 'NOTHING'}`,
      values,
    )
    n++
  }
  return n
}

try {
  await client.connect()
  await client.query('BEGIN')
  const t = data.tables
  console.log('question_sets:', await upsert('question_sets', ['id'], t.question_sets))
  console.log('set_questions:', await upsert('set_questions', ['id'], t.set_questions))
  console.log('email_flows:', await upsert('email_flows', ['id'], t.email_flows))
  console.log('email_steps:', await upsert('email_steps', ['id'], t.email_steps))
  let versions = 0
  for (const v of t.content_versions ?? []) {
    const r = await client.query(
      `INSERT INTO content_versions (entity_type, entity_id, version, snapshot, note, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (entity_type, entity_id, version) DO NOTHING`,
      [v.entity_type, v.entity_id, v.version, JSON.stringify(v.snapshot), v.note, v.created_by, v.created_at],
    )
    versions += r.rowCount
  }
  console.log('version history entries added:', versions)
  // Record the restore in each set's and flow's history.
  for (const s of t.question_sets ?? []) {
    const set = (await client.query(`SELECT * FROM question_sets WHERE id = $1`, [s.id])).rows[0]
    const qs = (await client.query(`SELECT id, position, topic, text, options, correct, seconds, status FROM set_questions WHERE set_id = $1 ORDER BY position`, [s.id])).rows
    const snap = { set: { name: set.name, description: set.description, program_area: set.program_area, source: set.source, questions_per_test: set.questions_per_test, seconds_per_question: set.seconds_per_question, total_seconds: set.total_seconds, max_attempts: set.max_attempts, status: set.status }, questions: qs }
    await client.query(`UPDATE question_sets SET version = (SELECT coalesce(max(version), 0) + 1 FROM content_versions WHERE entity_type = 'question_set' AND entity_id = $1) WHERE id = $1`, [s.id])
    await client.query(
      `INSERT INTO content_versions (entity_type, entity_id, version, snapshot, note, created_by)
       SELECT 'question_set', $1, coalesce(max(version), 0) + 1, $2, 'Restored from backup file', 'restore script' FROM content_versions WHERE entity_type = 'question_set' AND entity_id = $1`,
      [s.id, JSON.stringify(snap)],
    )
  }
  for (const f of t.email_flows ?? []) {
    const flow = (await client.query(`SELECT name, description, trigger, status, reentry_days, exit_on FROM email_flows WHERE id = $1`, [f.id])).rows[0]
    const steps = (await client.query(`SELECT id, position, delay_minutes, conditions, subject, preheader, heading, body, cta_label, cta_path, status FROM email_steps WHERE flow_id = $1 ORDER BY position`, [f.id])).rows
    await client.query(
      `INSERT INTO content_versions (entity_type, entity_id, version, snapshot, note, created_by)
       SELECT 'email_flow', $1, coalesce(max(version), 0) + 1, $2, 'Restored from backup file', 'restore script' FROM content_versions WHERE entity_type = 'email_flow' AND entity_id = $1`,
      [f.id, JSON.stringify({ flow, steps })],
    )
  }
  if (dryRun) {
    await client.query('ROLLBACK')
    console.log('Dry run finished: the file is valid and would restore as shown above. Nothing was changed.')
  } else {
    await client.query('COMMIT')
    console.log('Restore complete.')
  }
} catch (err) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('Restore failed (nothing was changed):', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
