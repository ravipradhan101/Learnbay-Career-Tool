import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { env } from './env'

const globalForPool = globalThis as unknown as { __navigatorPool?: Pool }

/**
 * pg treats sslmode=require/prefer/verify-ca as verify-full today but warns that this will change.
 * Pin the current, stricter behaviour (full certificate verification) so it cannot silently weaken.
 */
export function normalizeDatabaseUrl(url: string): string {
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full')
}

export function getPool(): Pool {
  if (!globalForPool.__navigatorPool) {
    const pool = new Pool({
      connectionString: normalizeDatabaseUrl(env.databaseUrl),
      // Serverless: many small instances, each with a modest pool, and idle connections closed quickly (Neon's pooler
      // multiplexes them, so the database never sees thousands of open connections).
      max: Math.max(2, Number(process.env.DB_POOL_MAX ?? '10') || 10),
      idleTimeoutMillis: 10_000,
      // Neon can take a few seconds to wake from idle; a short timeout turns that into a failed page load.
      connectionTimeoutMillis: 20_000,
      ssl: env.databaseSsl ? { rejectUnauthorized: env.databaseSslRejectUnauthorized } : undefined,
    })
    pool.on('error', (err) => console.error('[db] idle client error', err.message))
    globalForPool.__navigatorPool = pool
  }
  return globalForPool.__navigatorPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
