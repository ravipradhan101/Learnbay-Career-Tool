// Loads db/seed/companies.json into hiring_companies. Insert-only: companies already there (edited in Admin) are kept.
// Usage: npm run db:seed-companies
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
const { companies } = JSON.parse(await readFile(path.join(root, 'db', 'seed', 'companies.json'), 'utf8'))
const client = new pg.Client({
  connectionString: url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})
try {
  await client.connect()
  let added = 0
  for (const c of companies) {
    const r = await client.query(
      `INSERT INTO hiring_companies (name, category, alumni, featured) VALUES ($1, $2, $3, $4) ON CONFLICT (lower(name)) DO NOTHING`,
      [c.name, c.category, c.alumni === true, c.featured === true],
    )
    added += r.rowCount
  }
  console.log(`Companies: ${added} added, ${companies.length - added} already there.`)
} catch (err) {
  console.error('Seeding failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
