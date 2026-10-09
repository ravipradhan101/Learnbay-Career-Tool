// Loads db/profile-projects.json into the projects table: projects written for each work profile (src/config/profiles.ts),
// tagged with that profile and offered by the programs that fit their level. Safe to run again: a project with the
// same title is never duplicated or overwritten; it only gains the profile tag (so library projects can serve a
// profile too). New projects go in paused unless --activate is passed (use it once the matching code is deployed).
// Usage: npm run db:seed-profile-projects [-- --activate]
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const LEVEL_PROGRAMS = {
  nocode: ['applied-ai-practitioner'],
  lead: ['genai-agentic-ai-managers-leaders', 'applied-ai-practitioner'],
  analytics: ['data-business-analytics-genai', 'data-science-genai-program'],
  build: ['genai-agentic-ai-master'],
  ml: ['data-science-genai-master', 'ms-cs-data-science-ai', 'data-science-genai-program'],
  cloud: ['cloud-devops-engineering', 'cloud-devops-network', 'ai-cloud-devops-master'],
}

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1) }
const activate = process.argv.includes('--activate')
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const data = JSON.parse(await readFile(path.join(root, 'db/profile-projects.json'), 'utf8'))

const client = new pg.Client({
  connectionString: url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})
await client.connect()
let added = 0, tagged = 0
try {
  await client.query('BEGIN')
  for (const [profile, projects] of Object.entries(data.profiles)) {
    for (const x of projects) {
      const programs = LEVEL_PROGRAMS[x.level]
      if (!programs) throw new Error(`${x.title}: unknown level ${x.level}`)
      const existing = (await client.query(`SELECT id FROM projects WHERE lower(title) = lower($1) AND domain IS NULL LIMIT 1`, [x.title])).rows[0]
      if (existing) {
        const r = await client.query(`UPDATE projects SET profiles = (SELECT array_agg(DISTINCT p) FROM unnest(profiles || ARRAY[$2]) p), updated_at = now() WHERE id = $1 AND NOT ($2 = ANY(profiles))`, [existing.id, profile])
        tagged += r.rowCount
        continue
      }
      await client.query(
        `INSERT INTO projects (title, description, tools, kind, programs, source, source_ref, status, objective, outcome, industry, profiles)
         VALUES ($1, $2, $3, 'domain', $4, 'generated', $5, $6, $2, $7, $8, ARRAY[$9])`,
        [x.title, x.objective, x.tools, programs, `profile:${profile}`, activate ? 'active' : 'paused', x.outcome, x.industry, profile],
      )
      added++
    }
  }
  if (activate) {
    const r = await client.query(`UPDATE projects SET status = 'active', updated_at = now() WHERE source = 'generated' AND source_ref LIKE 'profile:%' AND status = 'paused'`)
    console.log(`Activated ${r.rowCount} profile projects.`)
  }
  await client.query('COMMIT')
  console.log(`Profile projects: ${added} added${activate ? '' : ' (paused)'}, ${tagged} existing projects tagged.`)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Seeding failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
