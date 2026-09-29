// Loads db/seed/projects.json into the project library. Usage: npm run db:seed-projects
// Insert-only: a project that already exists (same title and domain) is left alone, so re-running never
// overwrites edits made in Admin → Projects.
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
const { projects } = JSON.parse(await readFile(path.join(root, 'db', 'seed', 'projects.json'), 'utf8'))

const client = new pg.Client({
  connectionString: url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
})

try {
  await client.connect()
  const r = await client.query(
    `INSERT INTO projects (title, description, tools, kind, module, domain, programs, source, source_ref)
     SELECT x->>'title', coalesce(x->>'description', ''), ARRAY(SELECT jsonb_array_elements_text(coalesce(x->'tools', '[]'::jsonb))),
            x->>'kind', x->>'module', x->>'domain', ARRAY(SELECT jsonb_array_elements_text(x->'programs')), x->>'source', x->>'sourceRef'
       FROM jsonb_array_elements($1::jsonb) x
     ON CONFLICT (lower(title), coalesce(domain, '')) DO NOTHING`,
    [JSON.stringify(projects)],
  )
  const total = await client.query(`SELECT count(*)::int AS n FROM projects`)
  console.log(`Added ${r.rowCount} of ${projects.length} projects (library now has ${total.rows[0].n}).`)
} catch (err) {
  console.error('Seeding failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
