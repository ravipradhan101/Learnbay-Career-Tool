import { query } from '@/lib/db'
import { body, staffGuard } from '@/lib/crm/guard'
import { cleanMeetUrl } from '@/lib/meet/google'
import { cleanText, jsonError, jsonOk } from '@/lib/security'

/** A team member edits their own name, phone and Google Meet room. Nothing else about their account (role, team, access). */
export async function PATCH(request: Request) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  const b = await body(request, 2_000)
  const name = cleanText(b.name, 80)
  if (name.length < 2) return jsonError(400, 'Enter your full name.')
  const phone = cleanText(b.phone, 20).replace(/[^\d+]/g, '') || null
  const raw = typeof b.meetUrl === 'string' ? b.meetUrl.trim() : ''
  const meetUrl = raw ? cleanMeetUrl(raw) : null
  if (raw && !meetUrl) return jsonError(400, 'Paste a Google Meet link like https://meet.google.com/abc-defg-hij')
  await query(`UPDATE admin_users SET name = $2, phone = $3, meet_url = $4 WHERE id = $1`, [me.id, name, phone, meetUrl])
  return jsonOk({ message: 'Saved.' })
}
