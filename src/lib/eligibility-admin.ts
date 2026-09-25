import { query, queryOne } from './db'
import { AREAS, TOPICS, type QuestionSet } from './eligibility-sets'
import { cleanText } from './security'

export type SetInput = Partial<{
  name: string; description: string; program_area: string; source: 'ai' | 'bank'
  questions_per_test: number; seconds_per_question: number; total_seconds: number; max_attempts: number; status: 'active' | 'paused'
}>

const int = (v: unknown, min: number, max: number, label: string): number | string => {
  const n = Number(v)
  return Number.isInteger(n) && n >= min && n <= max ? n : `${label} must be a whole number from ${min} to ${max}.`
}

/** Validates set settings from the admin form. Only the fields present are changed. */
export function parseSet(b: Record<string, unknown>, creating = false): { value?: SetInput; error?: string } {
  const out: SetInput = {}
  if (creating || 'name' in b) {
    const name = cleanText(b.name, 100)
    if (name.length < 3) return { error: 'Give the question set a name (at least 3 characters).' }
    out.name = name
  }
  if ('description' in b) out.description = cleanText(b.description, 400)
  if (creating || 'programArea' in b) {
    const area = typeof b.programArea === 'string' ? b.programArea : 'any'
    if (!AREAS.some((a) => a.id === area)) return { error: 'Choose a program area.' }
    out.program_area = area
  }
  if ('source' in b) {
    if (b.source !== 'ai' && b.source !== 'bank') return { error: 'Choose how questions are picked.' }
    out.source = b.source
  }
  const numbers: [keyof SetInput, string, number, number, string][] = [
    ['questions_per_test', 'questionsPerTest', 3, 50, 'Questions per test'],
    ['seconds_per_question', 'secondsPerQuestion', 5, 300, 'Seconds per question'],
    ['total_seconds', 'totalSeconds', 30, 7200, 'Total test time (seconds)'],
    ['max_attempts', 'maxAttempts', 1, 10, 'Attempts'],
  ]
  for (const [key, field, min, max, label] of numbers) {
    if (!(field in b)) continue
    const v = int(b[field], min, max, label)
    if (typeof v === 'string') return { error: v }
    ;(out as Record<string, unknown>)[key] = v
  }
  if ('status' in b) {
    if (b.status !== 'active' && b.status !== 'paused') return { error: 'Invalid status.' }
    out.status = b.status
  }
  return { value: out }
}

/** Checks a set is usable before it goes live, so learners never meet a broken test. */
export async function readinessProblem(set: QuestionSet): Promise<string | null> {
  const r = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM set_questions WHERE set_id = $1 AND status = 'active'`, [set.id])
  const active = r?.n ?? 0
  if (set.source === 'bank' && active < set.questions_per_test) {
    return `This set picks from your questions only, so it needs at least ${set.questions_per_test} active questions (it has ${active}). Add questions, lower "questions per test", or switch to AI-generated.`
  }
  if (set.source === 'ai' && active < 3) return 'Add at least 3 active questions, used as a fallback if the AI is unavailable.'
  if (set.total_seconds < set.seconds_per_question) return 'The total test time must be at least as long as one question.'
  return null
}

export type QuestionInput = { topic: string; text: string; options: string[]; correct: number; seconds: number | null }

export function parseQuestion(b: Record<string, unknown>): { value?: QuestionInput; error?: string } {
  const text = cleanText(b.text, 240)
  if (text.length < 5) return { error: 'Write the question (at least 5 characters).' }
  const topic = typeof b.topic === 'string' && (TOPICS as readonly string[]).includes(b.topic) ? b.topic : null
  if (!topic) return { error: 'Choose a topic.' }
  const options = (Array.isArray(b.options) ? b.options : []).map((o) => cleanText(o, 120)).filter(Boolean)
  if (options.length < 2 || options.length > 6) return { error: 'Give 2 to 6 answer options.' }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { error: 'Answer options must all be different.' }
  const correct = Number(b.correct)
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return { error: 'Mark which option is correct.' }
  let seconds: number | null = null
  if (b.seconds !== null && b.seconds !== undefined && b.seconds !== '') {
    const v = int(b.seconds, 5, 300, 'Time for this question')
    if (typeof v === 'string') return { error: v }
    seconds = v
  }
  return { value: { topic, text, options, correct, seconds } }
}

/** Attempts and average score per set, for the admin list. */
export async function setStats() {
  return query<{ set_id: string; attempts: number; learners: number; avg_score: number | null }>(
    `SELECT set_id, count(*)::int AS attempts, count(DISTINCT user_id)::int AS learners, round(avg(score))::int AS avg_score
       FROM eligibility_tests WHERE status = 'completed' AND set_id IS NOT NULL GROUP BY set_id`,
  )
}

export async function recentAttempts(limit = 50) {
  return query<{ user_id: string; name: string | null; email: string; attempt: number; score: number; source: string | null; set_name: string | null; completed_at: Date }>(
    `SELECT t.user_id, u.name, u.email, t.attempt, t.score, t.source, s.name AS set_name, t.completed_at
       FROM eligibility_tests t JOIN users u ON u.id = t.user_id LEFT JOIN question_sets s ON s.id = t.set_id
      WHERE t.status = 'completed' ORDER BY t.completed_at DESC LIMIT $1`,
    [limit],
  )
}
