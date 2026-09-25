// Sets an admin's password from the server's terminal (for when the admin mailbox can't receive the code).
// Usage: npm run admin:password -- admissions@learnbay.co
// The password is typed at a hidden prompt; it is never passed as an argument, logged or stored in plain text.
import { randomBytes, scrypt } from 'node:crypto'
import { stdin, stdout } from 'node:process'
import pg from 'pg'

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:password -- <admin email>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env in the project root.')
  process.exit(1)
}
if (!stdin.isTTY) {
  console.error('Run this in an interactive terminal so the password can be typed at a hidden prompt.')
  process.exit(1)
}

function ask(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt)
    let value = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); stdout.write('\n'); resolve(value)
      } else if (ch === '\u0003') {
        stdout.write('\n'); process.exit(130)
      } else if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1)
      } else {
        value += ch
      }
    }
    stdin.on('data', onData)
  })
}

const password = await ask(`New admin password for ${email}: `)
if (password.length < 8) { console.error('Use at least 8 characters.'); process.exit(1) }
if ((await ask('Type it again: ')) !== password) { console.error('The passwords do not match.'); process.exit(1) }

const N = 16384, r = 8, p = 1
const salt = randomBytes(16)
const key = await new Promise((res, rej) => scrypt(password.normalize('NFKC'), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))))
const hash = `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full'),
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
})
try {
  await client.connect()
  const { rows } = await client.query(
    `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, failed_attempts = 0, locked_until = NULL
     RETURNING id`,
    [email, hash],
  )
  await client.query(`DELETE FROM admin_sessions WHERE admin_id = $1`, [rows[0].id])
  console.log(`Password set for ${email}. Sign in at /admin/login.`)
} catch (err) {
  console.error('Failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
