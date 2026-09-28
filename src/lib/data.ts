import { cache } from 'react'
import { redirect } from 'next/navigation'
import { query, queryOne } from './db'
import { cookies, headers } from 'next/headers'
import { SESSION_COOKIE, type User } from './auth'
import { sha256 } from './security'
import { linkMatches } from './links'
import type { Answers } from './questions'
import type { ToolId } from './tools-meta'
import type { ResumeAnalysis, ToolResultMap } from './tool-types'

export type ToolRow = {
  tool: ToolId
  status: 'pending' | 'generating' | 'ready' | 'failed'
  data: ToolResultMap[ToolId] | null
  attempts: number
  share_token: string | null
  updated_at: Date
}

export const getAnswers = cache(async (userId: string): Promise<Answers | null> => {
  const row = await queryOne<{ answers: Answers }>(`SELECT answers FROM assessments WHERE user_id = $1`, [userId])
  return row?.answers ?? null
})

export const getToolRows = cache(async (userId: string): Promise<ToolRow[]> =>
  query<ToolRow>(`SELECT tool, status, data, attempts, share_token, updated_at FROM tool_results WHERE user_id = $1`, [userId]),
)

export async function getReadyResults(userId: string): Promise<Partial<ToolResultMap>> {
  const rows = await getToolRows(userId)
  const out: Partial<ToolResultMap> = {}
  for (const r of rows) if (r.status === 'ready' && r.data) (out as Record<string, unknown>)[r.tool] = r.data
  return out
}

export const getLatestSession = cache(async (userId: string) =>
  queryOne<{ id: string; session_type: string; preferred_date: string | null; preferred_time: string | null; preferred_slot: string; status: string; created_at: Date }>(
    `SELECT id, session_type, to_char(preferred_date, 'YYYY-MM-DD') AS preferred_date, preferred_time, preferred_slot, status, created_at
       FROM counsellor_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId],
  ),
)

export async function getSessions(userId: string) {
  return query<{ id: string; session_type: string; preferred_date: string | null; preferred_time: string | null; note: string | null; status: string; created_at: Date }>(
    `SELECT id, session_type, to_char(preferred_date, 'YYYY-MM-DD') AS preferred_date, preferred_time, note, status, created_at
       FROM counsellor_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [userId],
  )
}

export async function getResumeAnalysis(userId: string) {
  return queryOne<{ data: ResumeAnalysis; created_at: Date }>(`SELECT data, created_at FROM resume_analyses WHERE user_id = $1`, [userId])
}

export async function getConversation(userId: string, context: string) {
  // One round trip: the latest conversation for this context and its messages.
  const rows = await query<{ conversation_id: string; role: 'user' | 'model'; content: string }>(
    `WITH latest AS (
       SELECT conversation_id FROM chat_messages WHERE user_id = $1 AND context = $2 ORDER BY created_at DESC, id DESC LIMIT 1
     )
     SELECT m.conversation_id, m.role, m.content FROM chat_messages m JOIN latest l ON l.conversation_id = m.conversation_id
      WHERE m.user_id = $1 ORDER BY m.created_at, m.id`,
    [userId, context],
  )
  return { conversationId: rows[0]?.conversation_id ?? null, messages: rows.map(({ role, content }) => ({ role, content })) }
}

type LatestSession = { session_type: string; preferred_date: string | null; preferred_time: string | null; status: string } | null
export type StudioData = { user: User; answers: Answers; tools: ToolRow[]; hasSession: boolean; latestSession: LatestSession }

/**
 * Every dashboard page: a signed-in learner who finished onboarding.
 * Loads the session, profile, answers, tool results and latest 1:1 request in ONE database round trip,
 * because round trips (not query cost) dominate response time when the database is remote.
 */
export const getStudio = cache(async (): Promise<StudioData> => {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  // After login, return to the page they asked for (e.g. a tool linked from an email), not just the home.
  const h = await headers()
  const path = h.get('x-pathname') ?? ''
  const safePath = /^\/dashboard(\/[a-z-]+(\/report)?)?$/.test(path) ? path : '/dashboard'
  const linkFor = h.get('x-link-for')
  const loginUrl = `/login?next=${encodeURIComponent(linkFor ? `${safePath}?for=${linkFor}` : safePath)}`
  if (!token || token.length > 100) redirect(loginUrl)
  const row = await queryOne<User & { answers: Answers | null; tools: ToolRow[] | null; latest_session: LatestSession }>(
    `SELECT u.id, u.email, u.name, u.phone_country, u.phone, u.created_at, a.answers,
            (SELECT json_agg(json_build_object('tool', t.tool, 'status', t.status, 'data', t.data, 'attempts', t.attempts,
                    'share_token', t.share_token, 'updated_at', t.updated_at)) FROM tool_results t WHERE t.user_id = u.id) AS tools,
            (SELECT json_build_object('session_type', c.session_type, 'preferred_date', to_char(c.preferred_date, 'YYYY-MM-DD'),
                    'preferred_time', c.preferred_time, 'status', c.status)
               FROM counsellor_requests c WHERE c.user_id = u.id ORDER BY c.created_at DESC LIMIT 1) AS latest_session
       FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN assessments a ON a.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  )
  if (!row) redirect(loginUrl)
  const { answers, tools, latest_session, ...user } = row
  // An emailed link meant for a different learner: never show or build this account's reports under it.
  if (!linkMatches(user.id, linkFor)) redirect(`/account/switch?next=${encodeURIComponent(safePath)}`)
  if (!answers || !answers.interest || !user.phone) redirect('/start')
  return { user, answers, tools: tools ?? [], hasSession: Boolean(latest_session), latestSession: latest_session }
})
