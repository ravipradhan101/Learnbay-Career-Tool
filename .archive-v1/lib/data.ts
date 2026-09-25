import { cache } from 'react'
import { redirect } from 'next/navigation'
import { query, queryOne } from './db'
import { getCurrentUser, type User } from './auth'
import type { Answers } from './questions'
import type { ReportData, ResumeAnalysis } from './report-types'

export type ReportRow = {
  id: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
  data: ReportData | null
  attempts: number
  share_token: string | null
  created_at: Date
  updated_at: Date
}

export const getAssessment = cache(async (userId: string) =>
  queryOne<{ answers: Answers; created_at: Date }>(`SELECT answers, created_at FROM assessments WHERE user_id = $1`, [userId]),
)

export const getReport = cache(async (userId: string) =>
  queryOne<ReportRow>(`SELECT id, status, data, attempts, share_token, created_at, updated_at FROM reports WHERE user_id = $1`, [userId]),
)

export const getResumeAnalysis = cache(async (userId: string) =>
  queryOne<{ data: ResumeAnalysis; file_name: string | null; created_at: Date }>(
    `SELECT data, file_name, created_at FROM resume_analyses WHERE user_id = $1`,
    [userId],
  ),
)

export async function getLatestCounsellorRequest(userId: string) {
  return queryOne<{ id: string; preferred_date: string | null; preferred_slot: string; status: string; created_at: Date }>(
    `SELECT id, to_char(preferred_date, 'YYYY-MM-DD') AS preferred_date, preferred_slot, status, created_at
       FROM counsellor_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId],
  )
}

export async function getChatHistory(userId: string) {
  const latest = await queryOne<{ conversation_id: string }>(
    `SELECT conversation_id FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [userId],
  )
  if (!latest) return { conversationId: null as string | null, messages: [] as { role: 'user' | 'model'; content: string }[] }
  const messages = await query<{ role: 'user' | 'model'; content: string }>(
    `SELECT role, content FROM chat_messages WHERE user_id = $1 AND conversation_id = $2 ORDER BY created_at, id`,
    [userId, latest.conversation_id],
  )
  return { conversationId: latest.conversation_id, messages }
}

export type DashboardData = { user: User; answers: Answers; report: ReportRow & { data: ReportData } }

/**
 * For dashboard pages: signed-in user with a ready report. Redirects to login,
 * to the questionnaire, or leaves the layout to show the generating screen.
 */
export const getDashboardData = cache(async (): Promise<DashboardData | { user: User; answers: Answers; report: ReportRow; notReady: true }> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/dashboard')
  const [assessment, report] = await Promise.all([getAssessment(user.id), getReport(user.id)])
  if (!assessment || !report) redirect('/start')
  if (report.status !== 'ready' || !report.data) return { user, answers: assessment.answers, report, notReady: true }
  return { user, answers: assessment.answers, report: report as ReportRow & { data: ReportData } }
})

/** Same as getDashboardData but only for pages rendered inside a ready dashboard. */
export async function getReadyDashboard(): Promise<DashboardData> {
  const data = await getDashboardData()
  if ('notReady' in data) redirect('/dashboard')
  return data
}
