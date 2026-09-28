import { randomInt } from 'node:crypto'
import { getProgram, programsForInterest } from '@/config/programs'
import { query, queryOne } from './db'
import { env } from './env'
import { triggerFlows } from './email/flows'
import { type Track } from './eligibility-bank'
import { activeQuestions, activeSetFor, type QuestionSet, type SetQuestion } from './eligibility-sets'
import { generateJson } from './gemini'
import { sendMail } from './mailer'
import { learnerUrl } from './links'
import { EDU_LEVELS, PROGRAMMER, experienceLabel, interestLabel, labelOf, roleLabel, type Answers } from './questions'

// Timing, question count and attempts come from the active question set (Admin → Eligibility test) and are
// copied onto each attempt when it starts, so admin edits never change a test that is already running.
// The browser timer is only a display: every limit is enforced here on the server.
export type TestRules = { questions: number; perQuestionSeconds: number; sessionSeconds: number; maxAttempts: number }
export const DEFAULT_RULES: TestRules = { questions: 10, perQuestionSeconds: 20, sessionSeconds: 240, maxAttempts: 3 }
export const rulesOf = (set: QuestionSet | null): TestRules => set
  ? { questions: set.questions_per_test, perQuestionSeconds: set.seconds_per_question, sessionSeconds: set.total_seconds, maxAttempts: set.max_attempts }
  : DEFAULT_RULES
const GRACE_MS = 3_000 // network delay allowance

/** A question as stored on the server for one attempt. `answer` never leaves the server. */
type StoredQuestion = { id: string; text: string; options: string[]; answer: number; topic: string; seconds: number }
type StoredAnswer = { q: string; choice: number | null; correct: boolean; ms: number; timedOut: boolean }
type TestRow = {
  id: string
  user_id: string
  attempt: number
  track: Track
  question_ids: string[]
  questions: StoredQuestion[] | null
  source: string | null
  answers: StoredAnswer[]
  current_index: number
  question_started_at: Date
  started_at: Date
  deadline_at: Date
  completed_at: Date | null
  status: 'in_progress' | 'completed'
  correct: number | null
  total: number | null
  score: number | null
  band: string | null
  breakdown: Breakdown | null
}
export type Breakdown = { byTopic: { topic: string; correct: number; total: number }[]; unanswered: number; avgSeconds: number; seconds: number }
export type AttemptSummary = { attempt: number; score: number; completedAt: string }
export type Attempts = { used: number; max: number; left: number; history: AttemptSummary[]; best: number | null; callBooked: boolean; available: boolean }

export type TestState =
  | { status: 'not_started'; attempts: Attempts }
  | {
      status: 'in_progress'
      attempts: Attempts
      attempt: number
      index: number
      total: number
      question: { text: string; options: string[]; topic: string; seconds: number }
      questionEndsAt: number
      sessionEndsAt: number
      serverNow: number
    }
  | { status: 'completed'; attempts: Attempts; attempt: number; score: number; band: BandInfo; correct: number; total: number; breakdown: Breakdown; completedAt: string; trackLabel: string }

export type BandInfo = { id: 'ready' | 'primer' | 'foundation'; title: string; text: string }

export function bandFor(score: number): BandInfo {
  if (score >= 70) return { id: 'ready', title: 'Eligible: ready to start', text: 'You have the aptitude and the basic awareness to begin the program directly.' }
  if (score >= 50) return { id: 'primer', title: 'Eligible, with a short primer', text: 'You are eligible. A short foundation primer before the core modules will help you get the most from the program.' }
  return { id: 'foundation', title: 'Start with the foundation track', text: 'A foundation-first path will set you up well. Your counsellor will suggest the right starting point for you.' }
}

export function trackFor(interest: string | undefined): Track {
  return (['ai', 'cloud-devops', 'fde', 'data-science', 'analytics'] as const).find((t) => t === interest) ?? 'ai'
}

const TRACK_TOPIC: Record<Track, string> = {
  aptitude: 'Aptitude', ai: 'AI & GenAI', 'cloud-devops': 'Cloud & DevOps', fde: 'Forward Deployed Engineering', 'data-science': 'Data Science', analytics: 'Analytics',
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Shuffles the options and records where the correct one ended up. */
function finalise(id: string, text: string, correct: string, wrong: string[], topic: string, seconds: number): StoredQuestion {
  const options = shuffle([correct, ...wrong])
  return { id, text, options, answer: options.indexOf(correct), topic, seconds }
}

// ---------- Question generation ----------

/** Unbalanced quotes or a number that lost its leading digits (e.g. `",400`) mean the model output was mangled. */
const garbled = (t: string) => (t.match(/["“”]/g)?.length ?? 0) % 2 === 1 || /(^|[\s(])[",.]+\d/.test(t) || /[{}\\]/.test(t)
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '')

const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array', minItems: 6, maxItems: 52,
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', enum: ['Aptitude', 'Full form', 'Concept', 'Tools'] },
          text: { type: 'string', description: 'The question. At most 12 words. Plain English.' },
          correct: { type: 'string', description: 'The single correct answer. At most 6 words.' },
          wrong: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Three clearly wrong but plausible options. At most 6 words each.' },
        },
        required: ['topic', 'text', 'correct', 'wrong'],
      },
    },
  },
  required: ['questions'],
}

async function generateQuestions(userId: string, a: Answers, track: Track, avoid: string[], set: QuestionSet, bank: SetQuestion[]): Promise<StoredQuestion[] | null> {
  const count = set.questions_per_test
  const coder = a.programmer === 'yes'
  const ask = count + 2
  const apt = Math.round(ask * 0.33), full = Math.round(ask * 0.25)
  const prompt = `Create an EASY ${ask}-question eligibility quiz for a learner joining a ${TRACK_TOPIC[track]} program.

Learner:
- Current role: ${roleLabel(a)}, ${experienceLabel(a)}
- Codes at work: ${labelOf(PROGRAMMER, a.programmer) ?? 'unknown'}
- Highest qualification: ${labelOf(EDU_LEVELS, a.eduLevel) ?? 'unknown'}

Mix (in random order):
- ${apt} x "Aptitude": simple verbal or logical reasoning WITHOUT numbers (analogies, odd one out by meaning, what must be true). No maths, no calculations, no number series.
- ${full} x "Full form": what a common ${TRACK_TOPIC[track]} or IT abbreviation stands for (e.g. API, SQL, LLM, CI/CD, KPI).
- ${ask - apt - full} x "Concept" or "Tools": basic, well-known ideas or tools in ${TRACK_TOPIC[track]}.${coder ? '' : ' No code snippets and no programming syntax: this learner does not code.'}

Rules:
- The quiz must be easy: someone with this background who has read a little about ${TRACK_TOPIC[track]} should get most answers right.
- Each question is readable and answerable well within ${set.seconds_per_question} seconds: at most 12 words, no stories or scenarios, no code blocks.
- Exactly one option is correct and unambiguous; wrong options are clearly wrong to someone who knows the basics. No "all of the above" or "none of the above".
- Options are at most 6 words each.
- Indian context where relevant (₹, lakh).${avoid.length ? `\n- Do NOT repeat or closely rephrase any of these earlier questions:\n${avoid.map((q) => `  - ${q}`).join('\n')}` : ''}`
  try {
    const raw = await generateJson<{ questions?: unknown }>({
      system: 'You write short, friendly, easy multiple-choice quiz questions for Learnbay, an Indian upskilling company. Output only what the schema asks for.',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      jsonSchema: QUESTION_SCHEMA,
      temperature: 0.9,
      maxOutputTokens: Math.min(12_000, 300 * ask + 600),
      thinkingBudget: 0,
      timeoutMs: 25_000,
      usage: { userId, feature: 'eligibility-test' },
    })
    const list = Array.isArray(raw.questions) ? raw.questions : []
    const seen = new Set<string>()
    const out: StoredQuestion[] = []
    for (const item of list) {
      const q = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
      const text = clean(q.text, 140)
      const correct = clean(q.correct, 60)
      const wrong = (Array.isArray(q.wrong) ? q.wrong : []).map((w) => clean(w, 60)).filter((w) => w && w.toLowerCase() !== correct.toLowerCase())
      const unique = [...new Set(wrong.map((w) => w.toLowerCase()))]
      // Anything too long to read and answer in ~15 seconds, or garbled (broken quotes or numbers), is dropped.
      if (!text || !correct || unique.length < 3 || seen.has(text.toLowerCase()) || text.split(/\s+/).length > 16 || garbled(text) || [correct, ...wrong].some(garbled)) continue
      seen.add(text.toLowerCase())
      const topic = ['Aptitude', 'Full form', 'Concept', 'Tools'].includes(q.topic as string) ? (q.topic as string) : 'Concept'
      out.push(finalise(`g${out.length + 1}`, text, correct, wrong.slice(0, 3), topic, set.seconds_per_question))
    }
    if (out.length < Math.min(6, count)) return null
    // Top up from the set's own questions if a few generated ones were dropped for length or duplicates.
    const topUp = fromBank(bank, count, avoid, set).filter((b) => !seen.has(b.text.toLowerCase()))
    return shuffle([...out.slice(0, count), ...topUp].slice(0, count)).map((q, i) => ({ ...q, id: `q${i + 1}` }))
  } catch (err) {
    console.error('[eligibility] question generation failed', (err as Error).message)
    return null
  }
}

/**
 * Questions from the admin's question set: a random draw spread across topics, preferring questions the learner
 * has not seen in earlier attempts. Paused questions are never used.
 */
function fromBank(bank: SetQuestion[], count: number, avoid: string[], set: QuestionSet): StoredQuestion[] {
  const unseen = bank.filter((q) => !avoid.includes(q.text))
  const pool = unseen.length >= count ? unseen : [...unseen, ...shuffle(bank.filter((q) => avoid.includes(q.text)))]
  const byTopic = new Map<string, SetQuestion[]>()
  for (const q of shuffle(pool)) byTopic.set(q.topic, [...(byTopic.get(q.topic) ?? []), q])
  const picked: SetQuestion[] = []
  while (picked.length < count && [...byTopic.values()].some((l) => l.length)) {
    for (const list of byTopic.values()) if (list.length && picked.length < count) picked.push(list.shift()!)
  }
  return shuffle(picked).map((q, i) => {
    const correct = q.options[q.correct] ?? q.options[0]
    return finalise(`b${i + 1}`, q.text, correct, q.options.filter((_, j) => j !== q.correct), q.topic, q.seconds ?? set.seconds_per_question)
  })
}

// ---------- State ----------

async function latest(userId: string): Promise<TestRow | null> {
  return queryOne<TestRow>(`SELECT * FROM eligibility_tests WHERE user_id = $1 ORDER BY attempt DESC LIMIT 1`, [userId])
}

async function attemptsFor(userId: string, known?: QuestionSet): Promise<Attempts> {
  const r = await queryOne<{ used: number; history: AttemptSummary[] | null; booked: boolean; interest: string | null }>(
    `SELECT (SELECT count(*)::int FROM eligibility_tests WHERE user_id = $1) AS used,
            (SELECT answers->>'interest' FROM assessments WHERE user_id = $1) AS interest,
            (SELECT json_agg(json_build_object('attempt', attempt, 'score', score, 'completedAt', completed_at) ORDER BY attempt)
               FROM eligibility_tests WHERE user_id = $1 AND status = 'completed') AS history,
            EXISTS (SELECT 1 FROM counsellor_requests WHERE user_id = $1) AS booked`,
    [userId],
  )
  const history = r?.history ?? []
  const used = r?.used ?? 0
  const set = known ?? (await activeSetFor(r?.interest ?? undefined))
  const max = rulesOf(set).maxAttempts
  return {
    used, max, left: set ? Math.max(0, max - used) : 0, history,
    best: history.length ? Math.max(...history.map((h) => h.score)) : null, callBooked: Boolean(r?.booked), available: Boolean(set),
  }
}

function questionsOf(t: TestRow): StoredQuestion[] {
  return t.questions ?? []
}
/** Attempts started before per-question times existed used 20 seconds. */
const secondsOf = (q: StoredQuestion | undefined) => q?.seconds ?? DEFAULT_RULES.perQuestionSeconds

async function toState(t: TestRow | null, userId: string, set?: QuestionSet): Promise<TestState> {
  const attempts = await attemptsFor(userId, set)
  if (!t) return { status: 'not_started', attempts }
  if (t.status === 'completed') {
    return {
      status: 'completed', attempts, attempt: t.attempt, score: t.score ?? 0, band: bandFor(t.score ?? 0), correct: t.correct ?? 0, total: t.total ?? questionsOf(t).length,
      breakdown: t.breakdown!, completedAt: new Date(t.completed_at!).toISOString(), trackLabel: TRACK_TOPIC[t.track],
    }
  }
  const q = questionsOf(t)[t.current_index]
  const started = new Date(t.question_started_at).getTime()
  return {
    status: 'in_progress',
    attempts,
    attempt: t.attempt,
    index: t.current_index,
    total: questionsOf(t).length,
    question: { text: q.text, options: q.options, topic: q.topic, seconds: secondsOf(q) },
    questionEndsAt: Math.min(started + secondsOf(q) * 1000, new Date(t.deadline_at).getTime()),
    sessionEndsAt: new Date(t.deadline_at).getTime(),
    serverNow: Date.now(),
  }
}

export async function getTestState(userId: string, set?: QuestionSet): Promise<TestState> {
  let t = await latest(userId)
  // Catch up on time that ran out while the learner was away (closed tab, lost connection).
  for (let guard = 0; t && t.status === 'in_progress' && guard < questionsOf(t).length + 1; guard++) {
    const now = Date.now()
    if (now > new Date(t.deadline_at).getTime() + GRACE_MS) { t = await complete(t); break }
    if (now > new Date(t.question_started_at).getTime() + secondsOf(questionsOf(t)[t.current_index]) * 1000 + GRACE_MS) {
      t = (await record(t, t.current_index, null)) ?? (await latest(userId))
      continue
    }
    break
  }
  return toState(t, userId, set)
}

/** Builds one attempt from the active set: AI-generated (falling back to the set's questions), or drawn only from the set. */
async function buildAttempt(userId: string, answers: Answers, set: QuestionSet): Promise<{ questions: StoredQuestion[]; source: 'ai' | 'bank' }> {
  const track = trackFor(answers.interest)
  const [earlier, bank] = await Promise.all([
    query<{ questions: StoredQuestion[] | null }>(`SELECT questions FROM eligibility_tests WHERE user_id = $1`, [userId]),
    activeQuestions(set.id),
  ])
  const avoid = earlier.flatMap((e) => (e.questions ?? []).map((q) => q.text)).slice(-60)
  if (set.source === 'ai') {
    const generated = await generateQuestions(userId, answers, track, avoid, set, bank)
    if (generated) return { questions: generated, source: 'ai' }
  }
  return { questions: fromBank(bank, set.questions_per_test, avoid, set), source: 'bank' }
}

const g = globalThis as unknown as { __eligPreparing?: Map<string, Promise<void>> }

/**
 * Generates the learner's next attempt in the background (when they open the test page, and after each attempt),
 * so pressing Start is instant instead of waiting for the AI. Safe to call repeatedly.
 */
export function prepareNextAttempt(userId: string, answers: Answers): void {
  const busy = (g.__eligPreparing ??= new Map())
  if (busy.has(userId) || !answers.interest) return
  const job = (async () => {
    const set = await activeSetFor(answers.interest)
    if (!set) return
    const r = await queryOne<{ used: number; open: boolean; ready: boolean }>(
      `SELECT (SELECT count(*)::int FROM eligibility_tests WHERE user_id = $1) AS used,
              EXISTS (SELECT 1 FROM eligibility_tests WHERE user_id = $1 AND status = 'in_progress') AS open,
              EXISTS (SELECT 1 FROM eligibility_prepared p WHERE p.user_id = $1 AND p.set_id = $2 AND p.set_version = $3
                        AND p.attempt = (SELECT count(*) + 1 FROM eligibility_tests WHERE user_id = $1)) AS ready`,
      [userId, set.id, set.version],
    )
    if (!r || r.open || r.ready || r.used >= set.max_attempts) return
    const built = await buildAttempt(userId, answers, set)
    if (!built.questions.length) return
    // A set prepared from an older version of the question set is replaced.
    await query(
      `INSERT INTO eligibility_prepared (user_id, attempt, questions, source, set_id, set_version) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, attempt) DO UPDATE SET questions = EXCLUDED.questions, source = EXCLUDED.source, set_id = EXCLUDED.set_id,
              set_version = EXCLUDED.set_version, created_at = now()`,
      [userId, r.used + 1, JSON.stringify(built.questions), built.source, set.id, set.version],
    )
  })()
    .catch((err) => console.error('[eligibility] prepare failed', (err as Error).message))
    .finally(() => busy.delete(userId))
  busy.set(userId, job)
}

/** Starts the next attempt, using the questions prepared in the background when they match the current question set. */
export async function startTest(userId: string, answers: Answers): Promise<{ state?: TestState; error?: string }> {
  const current = await latest(userId)
  if (current?.status === 'in_progress') return { state: await getTestState(userId) }
  const set = await activeSetFor(answers.interest)
  if (!set) return { error: 'The eligibility test is not available right now. Please book a call and a counsellor will help you.' }
  const attempt = (current?.attempt ?? 0) + 1
  if (attempt > set.max_attempts) return { error: `You have used all ${set.max_attempts} attempts. Your counsellor will go through your best score with you.` }
  const track = trackFor(answers.interest)
  // If this learner's questions are being prepared right now, wait for them rather than generating twice.
  await g.__eligPreparing?.get(userId)
  // Take the prepared set for this attempt (if it matches the current question set) and clear any stale ones.
  const taken = await query<{ attempt: number; set_id: string | null; set_version: number | null; questions: StoredQuestion[]; source: 'ai' | 'bank' }>(
    `DELETE FROM eligibility_prepared WHERE user_id = $1 AND attempt <= $2 RETURNING attempt, set_id, set_version, questions, source`,
    [userId, attempt],
  )
  const prepared = taken.find((p) => p.attempt === attempt && p.set_id === set.id && p.set_version === set.version)
  const { questions, source } = prepared ?? (await buildAttempt(userId, answers, set))
  if (!questions.length) return { error: 'The eligibility test is not available right now. Please book a call and a counsellor will help you.' }
  await query(
    `INSERT INTO eligibility_tests (user_id, attempt, track, question_ids, questions, source, deadline_at, question_started_at, set_id, set_version)
     VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(secs => $7), now(), $8, $9)
     ON CONFLICT DO NOTHING`,
    [userId, attempt, track, questions.map((q) => q.id), JSON.stringify(questions), source, set.total_seconds, set.id, set.version],
  )
  return { state: await getTestState(userId, set) }
}

/** Records the answer for question `index` (null = skipped / timed out) and moves on. Returns the updated row, or null if it lost a race. */
async function record(t: TestRow, index: number, choice: number | null): Promise<TestRow | null> {
  const q = questionsOf(t)[index]
  const elapsed = Date.now() - new Date(t.question_started_at).getTime()
  const timedOut = elapsed > secondsOf(q) * 1000 + GRACE_MS
  const valid = !timedOut && Number.isInteger(choice) && (choice as number) >= 0 && (choice as number) < q.options.length ? (choice as number) : null
  const entry: StoredAnswer = { q: q.id, choice: valid, correct: valid !== null && valid === q.answer, ms: Math.min(elapsed, secondsOf(q) * 1000), timedOut: timedOut || valid === null }
  const updated = await queryOne<TestRow>(
    `UPDATE eligibility_tests SET answers = answers || $3::jsonb, current_index = current_index + 1, question_started_at = now()
      WHERE id = $1 AND current_index = $2 AND status = 'in_progress' RETURNING *`,
    [t.id, index, JSON.stringify([entry])],
  )
  if (updated && updated.current_index >= questionsOf(updated).length) return complete(updated)
  return updated
}

export async function submitAnswer(userId: string, index: number, choice: number | null): Promise<TestState> {
  const t = await latest(userId)
  if (!t) return toState(null, userId)
  if (t.status === 'completed') return toState(t, userId)
  if (Date.now() > new Date(t.deadline_at).getTime() + GRACE_MS) return toState(await complete(t), userId)
  if (index === t.current_index) await record(t, index, choice)
  return getTestState(userId)
}

/** Scores the attempt once (idempotent), then emails the learner and the counsellor team. */
async function complete(t: TestRow): Promise<TestRow> {
  const answered = new Map(t.answers.map((a) => [a.q, a]))
  const topics = new Map<string, { correct: number; total: number }>()
  let correct = 0, unanswered = 0, ms = 0
  for (const q of questionsOf(t)) {
    const a = answered.get(q.id)
    const bucket = topics.get(q.topic) ?? { correct: 0, total: 0 }
    bucket.total++
    if (!a || a.choice === null) unanswered++
    if (a?.correct) { correct++; bucket.correct++ }
    ms += a?.ms ?? 0
    topics.set(q.topic, bucket)
  }
  const total = questionsOf(t).length || 1
  const score = Math.round((correct / total) * 100)
  const breakdown: Breakdown = {
    byTopic: [...topics.entries()].map(([topic, v]) => ({ topic, ...v })), unanswered,
    avgSeconds: Math.round(ms / Math.max(1, t.answers.length) / 1000), seconds: Math.max(1, Math.round((Date.now() - new Date(t.started_at).getTime()) / 1000)),
  }
  const band = bandFor(score)
  const done = await queryOne<TestRow>(
    `UPDATE eligibility_tests SET status = 'completed', completed_at = now(), correct = $2, total = $3, score = $4, band = $5, breakdown = $6
      WHERE id = $1 AND status = 'in_progress' RETURNING *`,
    [t.id, correct, total, score, band.id, JSON.stringify(breakdown)],
  )
  if (!done) return (await latest(t.user_id))!
  afterCompletion(done).catch((err) => console.error('[eligibility] follow-up failed', (err as Error).message))
  return done
}

async function afterCompletion(t: TestRow) {
  const u = await queryOne<{ email: string; name: string | null; phone_country: string | null; phone: string | null; answers: Answers | null; best: number; attempts: number }>(
    `SELECT u.email, u.name, u.phone_country, u.phone, a.answers,
            (SELECT max(score) FROM eligibility_tests e WHERE e.user_id = u.id AND e.status = 'completed') AS best,
            (SELECT count(*)::int FROM eligibility_tests e WHERE e.user_id = u.id) AS attempts
       FROM users u LEFT JOIN assessments a ON a.user_id = u.id WHERE u.id = $1`,
    [t.user_id],
  )
  if (!u) return
  await query(`INSERT INTO lead_events (user_id, type, detail) VALUES ($1, 'eligibility_completed', $2)`, [t.user_id, JSON.stringify({ score: String(t.score), band: t.band ?? '', attempt: String(t.attempt) })])
  triggerFlows(t.user_id, 'eligibility_completed')
  if (u.answers) prepareNextAttempt(t.user_id, u.answers)
  const band = bandFor(t.score ?? 0)
  const first = (u.name ?? '').trim().split(/\s+/)[0] || 'there'
  const program = programsForInterest(u.answers?.interest)[0] ?? getProgram(null)
  const b = t.breakdown!
  const maxAttempts = rulesOf(await activeSetFor(u.answers?.interest)).maxAttempts
  const left = Math.max(0, maxAttempts - u.attempts)
  const jobs: Promise<void>[] = [
    sendMail({
      to: u.email,
      subject: 'Your eligibility test is complete',
      heading: `Well done, ${first}. Your eligibility test is complete`,
      paragraphs: [
        `You scored ${t.score}/100 (${t.correct} of ${t.total} correct) on attempt ${t.attempt} of ${maxAttempts} of the ${TRACK_TOPIC[t.track]} eligibility test.`,
        `${band.title}. ${band.text}`,
        'What happens next: a Learnbay counsellor will call you to walk through your result, the right track for you and any questions you have. If you would rather pick the time, book a slot below.',
        left ? `You have ${left} more attempt${left === 1 ? '' : 's'} if you want to improve your score. We suggest talking to your counsellor first.` : 'You have used all your attempts; your counsellor will go through your best score with you.',
      ],
      sections: [{ title: 'Your result', items: [
        ...b.byTopic.map((x) => `${x.topic}: ${x.correct}/${x.total}`),
        `Suggested program: ${program.name}`,
      ] }],
      cta: { label: 'Choose a time for the call', url: learnerUrl(t.user_id, '/dashboard/sessions') },
    }),
  ]
  const notify = env.counsellorNotifyEmail
  if (notify) {
    jobs.push(sendMail({
      to: notify,
      subject: `Eligibility test (attempt ${t.attempt}): ${u.name ?? u.email} scored ${t.score}/100`,
      heading: 'Eligibility test completed: please call this learner',
      paragraphs: [
        `Name: ${u.name ?? '(not given)'}`,
        `Email: ${u.email}`,
        `Phone: ${u.phone ? `${u.phone_country ?? ''} ${u.phone}` : '(not given)'}`,
        `Score: ${t.score}/100 (${band.title}), attempt ${t.attempt} of ${maxAttempts}. Best so far: ${u.best}/100.`,
        `By topic: ${b.byTopic.map((x) => `${x.topic} ${x.correct}/${x.total}`).join(', ')}; unanswered ${b.unanswered}.`,
        `Profile: ${u.answers ? `${roleLabel(u.answers)}, ${experienceLabel(u.answers)}, interested in ${interestLabel(u.answers)}` : 'n/a'}`,
        `Suggested program: ${program.name}`,
      ],
      cta: { label: 'Open this learner in admin', url: `${env.appUrl}/admin/users/${t.user_id}` },
    }))
  }
  await Promise.allSettled(jobs)
}
