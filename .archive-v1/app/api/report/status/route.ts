import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/security'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const report = await queryOne<{ status: string; attempts: number }>(`SELECT status, attempts FROM reports WHERE user_id = $1`, [user.id])
  if (!report) return jsonError(404, 'No report found.', { redirect: '/start' })
  return jsonOk({ status: report.status, attempts: report.attempts })
}
