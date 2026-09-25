import { query } from './db'

/** Server-side lead event (for actions that only the server can confirm). Fire-and-forget. */
export function track(userId: string, type: string, detail: Record<string, string> = {}) {
  query(`INSERT INTO lead_events (user_id, type, detail) VALUES ($1, $2, $3)`, [userId, type, JSON.stringify(detail)]).catch(() => {})
}
