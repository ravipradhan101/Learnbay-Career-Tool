// Loads the 2026 catalogue's project library (src/config/catalogue.json) into the projects table: each project's
// objective, tools, what the learner achieves, its industry and the programs that offer it. Safe to run again: a
// project is matched by its catalogue id (or, the first time, by title) and updated, never duplicated.
// Usage: npm run db:seed-catalogue-projects
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const CODE_TO_ID = {
  AAP: 'applied-ai-practitioner', DABA: 'data-business-analytics-genai', 'DSG-C': 'data-science-genai-program', 'DSG-M': 'data-science-genai-master',
  'GAI-SD': 'genai-software-developers', 'SDE-M': 'sde-genai-agentic-ai', 'FDE-M': 'forward-deployed-ai-engineer', 'GAI-M': 'genai-agentic-ai-master',
  'GAI-CD': 'genai-agentic-ai-cloud-devops', CD: 'cloud-devops-engineering', 'CD-M': 'ai-cloud-devops-master', AIL: 'genai-agentic-ai-managers-leaders',
  MCS: 'ms-cs-data-science-ai',
}

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1) }
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const kb = JSON.parse(await readFile(path.join(root, 'src/config/catalogue.json'), 'utf8'))
// A program's capstone list is the authority on which programs offer a project.
const offeredBy = {}
for (const p of kb.programs) for (const id of p.capstones) (offeredBy[id] ??= new Set()).add(CODE_TO_ID[p.code])
for (const x of kb.projects) for (const c of x.programs) if (CODE_TO_ID[c]) (offeredBy[x.id] ??= new Set()).add(CODE_TO_ID[c])

const client = new pg.Client({
  connectionString: url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})
await client.connect()
let added = 0, updated = 0
try {
  await client.query('BEGIN')
  for (const x of kb.projects) {
    const programs = [...(offeredBy[x.id] ?? [])]
    const fields = [x.title, x.objective, x.tools, programs, x.objective, x.outcome, x.domain, x.id]
    const existing = (await client.query(
      `SELECT id, programs FROM projects WHERE catalogue_ref = $1 OR (catalogue_ref IS NULL AND lower(title) = lower($2) AND domain IS NULL) ORDER BY (catalogue_ref = $1) DESC NULLS LAST LIMIT 1`,
      [x.id, x.title],
    )).rows[0]
    if (existing) {
      await client.query(
        `UPDATE projects SET title = $1, description = $2, tools = $3, kind = 'capstone',
                programs = (SELECT array_agg(DISTINCT p) FROM unnest(programs || $4::text[]) p),
                objective = $5, outcome = $6, industry = $7, catalogue_ref = $8, updated_at = now()
          WHERE id = $9`,
        [...fields, existing.id],
      )
      updated++
    } else {
      await client.query(
        `INSERT INTO projects (title, description, tools, kind, programs, objective, outcome, industry, catalogue_ref, source, source_ref)
         VALUES ($1, $2, $3, 'capstone', $4, $5, $6, $7, $8, 'brochure', 'catalogue-2026')`,
        fields,
      )
      added++
    }
  }
  await client.query('COMMIT')
  console.log(`Catalogue projects: ${added} added, ${updated} updated (${kb.projects.length} in the catalogue).`)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
