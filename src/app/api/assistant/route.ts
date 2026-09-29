import { randomUUID } from 'node:crypto'
import { ASSISTANT_CONTEXTS, ASSISTANT_INTENTS, LIMITS, askAssistant, type AssistantContext, type AssistantIntent } from '@/lib/assistant'
import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { counsellorOf } from '@/lib/counsellor-server'
import { getCounsellor } from '@/lib/counsellors'
import { getAnswers, getReadyResults } from '@/lib/data'
import { cleanText, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from '@/lib/security'
import { firstName } from '@/lib/validation'
import type { ToolResultMap } from '@/lib/tool-types'
import { TRACK_TARGET, type Answers } from '@/lib/questions'
import { skillFamily } from '@/lib/skills'
import { projectTitles } from '@/lib/projects'
import { programForLearner } from '@/lib/segments'

export const maxDuration = 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Body = { context?: unknown; message?: unknown; conversationId?: unknown; history?: unknown; intent?: unknown; pending?: unknown; counsel?: unknown }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const body = await readJson<Body>(request, 12_000)
  const context = ASSISTANT_CONTEXTS.includes(body?.context as AssistantContext) ? (body!.context as AssistantContext) : 'home'
  // An intent is the counsellor speaking first (after sign-up, after a report); there is no learner message to store.
  const intent = ASSISTANT_INTENTS.includes(body?.intent as AssistantIntent) ? (body!.intent as AssistantIntent) : undefined
  const message = cleanText(body?.message, LIMITS.maxInput)
  // The question on screen (with its options) when the learner typed instead of tapping. Plain text, size-limited.
  const p = body?.pending as { question?: unknown; options?: unknown } | undefined
  const pending = p && Array.isArray(p.options)
    ? {
        question: cleanText(p.question, 200) ?? '',
        options: p.options.slice(0, 20).map((o) => ({ id: cleanText((o as { id?: unknown })?.id, 40) ?? '', label: cleanText((o as { label?: unknown })?.label, 80) ?? '' })).filter((o) => /^[a-z0-9+/_-]{1,40}$/i.test(o.id) && o.label),
      }
    : undefined
  // Off the scripted path: what they were doing (a short label) and how many counselling turns so far.
  const c = body?.counsel as { was?: unknown; round?: unknown } | undefined
  const counsel = c && typeof c === 'object'
    ? { was: cleanText(c.was, 120) || 'the chat', round: Math.max(0, Math.min(5, Math.floor(Number(c.round) || 0))) }
    : undefined
  if (!message && !intent) return jsonError(400, 'Type a question first.')

  const user = await getCurrentUser()
  // Career AI is available only inside the Studio, after sign-up.
  if (!user) return jsonError(401, 'Please sign in to chat with Career AI.')

  const usage = await queryOne<{ today: number; total: number }>(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today, count(*)::int AS total
       FROM chat_messages WHERE user_id = $1 AND role = 'user'`,
    [user.id],
  )
  if ((usage?.total ?? 0) >= LIMITS.userTotal || (usage?.today ?? 0) >= LIMITS.userPerDay) {
    return jsonError(429, 'You have reached your question limit for now. A mentor can take it from here — book a free session.', { limit: true })
  }
  if (!(await rateLimit(`assist:user:${user.id}`, 8, 60))) return jsonError(429, 'Please slow down a little and try again in a minute.')
  if (intent && !(await rateLimit(`assist:intent:${user.id}`, 12, 24 * 3600))) return jsonOk({ reply: '', suggestions: [], action: null, allowed: true, skipped: true })

  const [answers, results, counsellor] = await Promise.all([getAnswers(user.id), getReadyResults(user.id), counsellorOf(user.id)])
  // Tool chats only see that tool's result; the advisor sees everything.
  const isTool = context === 'skill-gap' || context === 'salary' || context === 'roadmap'
  const scoped: Partial<ToolResultMap> = isTool ? { [context]: results[context as keyof ToolResultMap] } : results
  const conversationId = typeof body?.conversationId === 'string' && UUID_RE.test(body.conversationId) ? body.conversationId : randomUUID()
  const history = await query<{ role: 'user' | 'model'; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at, id FROM chat_messages WHERE user_id = $1 AND (conversation_id = $2 OR created_at > now() - interval '30 days')
        ORDER BY created_at DESC, id DESC LIMIT 10
     ) h ORDER BY created_at, id`,
    [user.id, conversationId],
  )

  // The projects the program's library holds for this learner (so the counsellor names real ones).
  const recommended = answers ? programForLearner(answers) : undefined
  const projectTitlesList = recommended ? await projectTitles(recommended.id, answers?.domain, 12, answers?.role).catch(() => []) : []
  let out
  try {
    out = await askAssistant({ context, signedIn: true, userId: user.id, name: firstName(user.name), answers: answers ?? undefined, results: scoped, history, message: message ?? '', intent, counsellor: getCounsellor(counsellor).name, pending: pending?.options.length ? pending : undefined, counsel, projectTitles: projectTitlesList })
  } catch (err) {
    console.error('[assistant] failed', (err as Error).message)
    return jsonError(502, 'I am busy right now. Please try again in a moment.')
  }
  // The learner said something that changes their profile (e.g. "I don't code", "I'm a designer now", "I want data
  // science instead"): save it, so the recommended program, cards and reports follow straight away.
  let updated: { answers: Answers; reportsReset: boolean } | null = null
  if (out.profileUpdate && answers) {
    const prev = answers
    const next: Answers = { ...prev, ...out.profileUpdate }
    if (out.profileUpdate.interest) next.targetRole = TRACK_TARGET[out.profileUpdate.interest] ?? prev.targetRole
    delete next.program
    const reportsReset = next.interest !== prev.interest || skillFamily(next) !== skillFamily(prev)
    await query(`UPDATE assessments SET answers = $2, updated_at = now() WHERE user_id = $1`, [user.id, JSON.stringify(next)])
    if (reportsReset) await query(`UPDATE tool_results SET status = 'pending', attempts = 0, error = NULL, updated_at = now() WHERE user_id = $1 AND status IN ('ready', 'failed')`, [user.id])
    updated = { answers: next, reportsReset }
  }
  if (intent) {
    await query(`INSERT INTO chat_messages (user_id, conversation_id, role, content, context) VALUES ($1, $2, 'model', $3, $4)`, [user.id, conversationId, out.reply, context])
  } else {
    await query(
      `INSERT INTO chat_messages (user_id, conversation_id, role, content, context) VALUES ($1, $2, 'user', $3, $5), ($1, $2, 'model', $4, $5)`,
      [user.id, conversationId, message, out.reply, context],
    )
  }
  return jsonOk({ ...out, conversationId, ...(updated ? { answers: updated.answers, reportsReset: updated.reportsReset } : {}) })
}
