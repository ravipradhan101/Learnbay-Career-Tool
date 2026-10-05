// Loads db/seed/roles.json: roles and specialisations, and which courses offer projects for them (every course–role
// pair already used by a project, plus the core and extra pairs listed). Insert-only: edits made in Admin are kept.
// Usage: npm run db:seed-roles   (run after db:seed-projects)
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env in the project root.')
  process.exit(1)
}
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const seed = JSON.parse(await readFile(path.join(root, 'db', 'seed', 'roles.json'), 'utf8'))
const client = new pg.Client({
  connectionString: url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})
try {
  await client.connect()
  let roles = 0
  for (const d of seed.domains) {
    const r = await client.query(
      `INSERT INTO project_domains (key, label, kind, learner_roles, keywords) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
      [d.key, d.label, d.kind, d.learner_roles, d.keywords],
    )
    roles += r.rowCount
  }
  // Every course–role pair the project library already uses.
  const used = await client.query(`SELECT DISTINCT p AS program_id, domain FROM projects, unnest(programs) p WHERE domain IS NOT NULL`)
  const pairs = [
    ...used.rows.map((r) => [r.program_id, r.domain, false]),
    ...seed.core.map(([p, d]) => [p, d, true]),
    ...seed.extra.map(([p, d]) => [p, d, false]),
  ]
  let links = 0
  for (const [program, domain, core] of pairs) {
    const r = await client.query(
      `INSERT INTO course_roles (program_id, domain_key, core) SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM project_domains WHERE key = $2)
       ON CONFLICT (program_id, domain_key) DO UPDATE SET core = course_roles.core OR EXCLUDED.core`,
      [program, domain, core],
    )
    links += r.rowCount
  }
  console.log(`Roles: ${roles} added. Course–role links: ${links} added or confirmed.`)
} catch (err) {
  console.error('Seeding failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
