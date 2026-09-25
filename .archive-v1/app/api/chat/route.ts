import { randomUUID } from 'node:crypto'
import { getProgram, PROGRAMS } from '@/config/programs'
import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateText } from '@/lib/gemini'
import { describeAnswers } from '@/lib/report'
import { CHAT_DAILY_LIMIT as DAILY_LIMIT, CHAT_TOTAL_LIMIT as TOTAL_LIMIT } from '@/lib/limits'
import { cleanText, isSameOrigin, jsonError, jsonOk, readJson } from '@/lib/security'
import { firstName } from '@/lib/validation'
import type { Answers } from '@/lib/questions'
import type { ReportData } from '@/lib/report-types'

export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function systemPrompt(name: string, answers: Answers, report: ReportData): string {
  const program = getProgram(report.recommendedProgramId)
  return `You are "Career AI", the personal AI career advisor inside Learnbay's AI Career Navigator. You are talking to ${name}.

What you know about ${name}:
${describeAnswers(answers)}

Their personalised report (JSON):
${JSON.stringify({
  recommendedPath: report.recommendedPath,
  readiness: report.readiness,
  roadmap: report.roadmap,
  topGaps: report.topGaps,
  skills: report.skills,
  projects: report.projects.map((p) => ({ title: p.title, skills: p.skills, difficulty: p.difficulty })),
  salary: report.salary,
  recommendedProgram: program.name,
})}

Learnbay programs you may mention (use exact names): ${PROGRAMS.map((p) => p.name).join('; ')}.
Recommended for ${name}: ${program.name} — ${program.summary}

How to answer:
- Be warm, direct and specific to ${name}'s background, report and goals. Keep answers under 170 words.
- Use short paragraphs or "- " bullet points. Use **bold** sparingly. No headings, no tables.
- Stay on careers, skills, learning, projects, interviews and AI. Politely decline anything else.
- Never promise jobs or salaries. Salary numbers are indicative market ranges.
- Do not invent statistics, companies, people, fees, discounts, batch dates or durations.
- For fees, EMI, scholarships, batch timings, placements or enrolment, say a Learnbay career counselor can confirm the details and suggest using "Talk to a Counselor".
- When it genuinely helps, explain how the recommended Learnbay program addresses their gaps.`
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  const body = await readJson<{ message?: unknown; conversationId?: unknown }>(request, 8_000)
  const message = cleanText(body?.message, 1000)
  if (!message) return jsonError(400, 'Type a question to ask Career AI.')

  const usage = await queryOne<{ today: number; total: number }>(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today, count(*)::int AS total
       FROM chat_messages WHERE user_id = $1 AND role = 'user'`,
    [user.id],
  )
  if ((usage?.total ?? 0) >= TOTAL_LIMIT) {
    return jsonError(429, `You have used all ${TOTAL_LIMIT} Career AI questions. A career counselor can take it from here.`, { limit: 'total' })
  }
  if ((usage?.today ?? 0) >= DAILY_LIMIT) {
    return jsonError(429, `You have reached today's limit of ${DAILY_LIMIT} questions. Come back tomorrow, or talk to a counselor now.`, { limit: 'daily' })
  }

  const ctx = await queryOne<{ answers: Answers; data: ReportData | null }>(
    `SELECT a.answers, r.data FROM assessments a JOIN reports r ON r.user_id = a.user_id WHERE a.user_id = $1 AND r.status = 'ready'`,
    [user.id],
  )
  if (!ctx?.data) return jsonError(400, 'Your career report needs to be ready before you can chat.')

  const conversationId = typeof body?.conversationId === 'string' && UUID_RE.test(body.conversationId) ? body.conversationId : randomUUID()
  const history = await query<{ role: 'user' | 'model'; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at, id FROM chat_messages
        WHERE user_id = $1 AND conversation_id = $2 ORDER BY created_at DESC, id DESC LIMIT 12
     ) h ORDER BY created_at, id`,
    [user.id, conversationId],
  )

  let reply: string
  try {
    reply = await generateText({
      system: systemPrompt(firstName(user.name), ctx.answers, ctx.data),
      contents: [...history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })), { role: 'user' as const, parts: [{ text: message }] }],
      temperature: 0.6,
      maxOutputTokens: 1024,
      thinkingBudget: 0,
      timeoutMs: 45_000,
    })
  } catch (err) {
    console.error('[chat] failed', (err as Error).message)
    return jsonError(502, 'Career AI is busy right now. Please try again in a moment.')
  }
  reply = reply.slice(0, 4000)

  await query(
    `INSERT INTO chat_messages (user_id, conversation_id, role, content) VALUES ($1, $2, 'user', $3), ($1, $2, 'model', $4)`,
    [user.id, conversationId, message, reply],
  )
  const used = (usage?.total ?? 0) + 1
  return jsonOk({ reply, conversationId, remainingToday: DAILY_LIMIT - (usage?.today ?? 0) - 1, remainingTotal: TOTAL_LIMIT - used })
}
