import { env } from './env'
import { recordAiUsage, type UsageTag } from './ai-usage'

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } }
export type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

type GenerateOptions = {
  system: string
  contents: GeminiContent[]
  jsonSchema?: Record<string, unknown>
  temperature?: number
  maxOutputTokens?: number
  thinkingBudget?: number
  timeoutMs?: number
  /** Who and which feature to bill the tokens to (analytics). */
  usage?: UsageTag
}

export class GeminiError extends Error {
  /** The model's raw text, when it answered but not in the requested format. */
  raw?: string
  constructor(message: string, readonly retryable: boolean, raw?: string) {
    super(message)
    this.raw = raw
  }
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number }
}

/**
 * Gemini rejects schemas whose numeric bounds and array-length limits create too many decoding
 * states. Those limits are moved into the field description as guidance; output is clamped after.
 */
export function relaxSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(relaxSchema)
  if (!node || typeof node !== 'object') return node
  const { minimum, maximum, minItems, maxItems, ...rest } = node as Record<string, unknown>
  const hints: string[] = []
  if (minItems !== undefined || maxItems !== undefined) {
    hints.push(minItems === maxItems ? `Exactly ${minItems} items.` : `${minItems ?? 0}-${maxItems ?? 'n'} items.`)
  }
  if (minimum !== undefined || maximum !== undefined) hints.push(`Range ${minimum ?? ''}-${maximum ?? ''}.`)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) out[k] = k === 'properties' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, relaxSchema(pv)])) : relaxSchema(v)
  if (hints.length) out.description = [out.description, ...hints].filter(Boolean).join(' ')
  return out
}

async function callOnceRaw(opts: GenerateOptions, meter: Meter): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      thinkingConfig: { thinkingBudget: opts.thinkingBudget ?? 0 },
      ...(opts.jsonSchema ? { responseMimeType: 'application/json', responseJsonSchema: relaxSchema(opts.jsonSchema) } : {}),
    },
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      cache: 'no-store',
    })
  } catch (err) {
    throw new GeminiError(`Gemini request failed: ${(err as Error).message}`, true)
  }

  const data = (await res.json().catch(() => ({}))) as GeminiResponse
  meter.usage = data.usageMetadata
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500
    throw new GeminiError(`Gemini API ${res.status}: ${data.error?.message ?? 'unknown error'}`, retryable)
  }
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError(`Gemini blocked the request (${data.promptFeedback.blockReason})`, false)
  }
  const candidate = data.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim()
  if (!text) throw new GeminiError(`Gemini returned no text (finishReason: ${candidate?.finishReason ?? 'none'})`, true)
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new GeminiError(`Gemini stopped early (${candidate.finishReason})`, candidate.finishReason === 'MAX_TOKENS')
  }
  return text
}

type Meter = { usage?: GeminiResponse['usageMetadata'] }

/** One HTTP call to Gemini, with its token usage (or failure) written to ai_usage. Every retry is billed, so every attempt is logged. */
async function callOnce(opts: GenerateOptions): Promise<string> {
  const meter: Meter = {}
  const started = Date.now()
  let status = 'ok'
  try {
    return await callOnceRaw(opts, meter)
  } catch (err) {
    status = err instanceof GeminiError && /blocked/.test(err.message) ? 'blocked' : 'error'
    throw err
  } finally {
    if (opts.usage) {
      const u = meter.usage ?? {}
      recordAiUsage({
        ...opts.usage,
        model: MODEL,
        promptTokens: u.promptTokenCount ?? 0,
        outputTokens: u.candidatesTokenCount ?? 0,
        thoughtTokens: u.thoughtsTokenCount ?? 0,
        totalTokens: u.totalTokenCount ?? 0,
        latencyMs: Date.now() - started,
        status,
      })
    }
  }
}

// ---------- Traffic control ----------
// Caps simultaneous Gemini calls per server instance so a spike of thousands of users queues briefly
// instead of tripping Gemini's per-minute quota. Tune GEMINI_MAX_CONCURRENCY to your Gemini tier.
const MAX_CONCURRENT = Math.max(1, Number(process.env.GEMINI_MAX_CONCURRENCY ?? '40') || 40)
const MAX_QUEUE_WAIT_MS = 60_000
let active = 0
const waiting: (() => void)[] = []

async function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) { active++; return }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = waiting.indexOf(go)
      if (i >= 0) waiting.splice(i, 1)
      reject(new GeminiError('AI is very busy right now', true))
    }, MAX_QUEUE_WAIT_MS)
    function go() { clearTimeout(timer); active++; resolve() }
    waiting.push(go)
  })
}
function releaseSlot() {
  active--
  waiting.shift()?.()
}

/** Calls Gemini through the concurrency gate; retries transient errors (429, 5xx, timeouts) twice with backoff. */
export async function generateText(opts: GenerateOptions): Promise<string> {
  await acquireSlot()
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await callOnce(opts)
      } catch (err) {
        if (!(err instanceof GeminiError) || !err.retryable || attempt >= 2) throw err
        await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 4000 + Math.random() * 2000))
      }
    }
  } finally {
    releaseSlot()
  }
}

export async function generateJson<T>(opts: GenerateOptions & { jsonSchema: Record<string, unknown> }): Promise<T> {
  const text = await generateText(opts)
  try {
    return JSON.parse(text) as T
  } catch {
    // Occasionally the model wraps JSON in a code fence; strip it once before giving up.
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    try {
      return JSON.parse(stripped) as T
    } catch (err) {
      console.error('[gemini] invalid JSON', (err as Error).message, '| start:', stripped.slice(0, 160).replace(/\s+/g, ' '), '| end:', stripped.slice(-240).replace(/\s+/g, ' '), `| length ${stripped.length}`)
      throw new GeminiError('Gemini returned invalid JSON', true, stripped)
    }
  }
}
