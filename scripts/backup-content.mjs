// Exports everything admins edit in the app to backups/content-<date>.json:
// eligibility question sets and questions, email flows and emails, their full version history, and app settings.
// Learner data is NOT included (use your database provider's backups for that).
// Usage: npm run backup
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env in the project root.')
  process.exit(1)
}
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})
const TABLES = ['app_meta', 'question_sets', 'set_questions', 'email_flows', 'email_steps', 'content_versions']
try {
  await client.connect()
  const data = { type: 'learnbay-career-studio-content-backup', createdAt: new Date().toISOString(), tables: {} }
  for (const t of TABLES) data.tables[t] = (await client.query(`SELECT * FROM ${t} ORDER BY 1`)).rows
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13)
  const dir = path.join(root, 'backups')
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `content-${stamp}.json`)
  await writeFile(file, JSON.stringify(data, null, 2))
  console.log(`Backup written: ${path.relative(root, file)}`)
  for (const t of TABLES) console.log(`  ${t}: ${data.tables[t].length} rows`)
} catch (err) {
  console.error('Backup failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
