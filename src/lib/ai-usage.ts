import { query } from './db'

/** Feature names shown in the admin token report. Assistant calls are `assistant:<context>`. */
export type UsageTag = { userId: string | null; feature: string }

type UsageRow = UsageTag & {
  model: string
  promptTokens: number
  outputTokens: number
  thoughtTokens: number
  totalTokens: number
  latencyMs: number
  status: string
}

/** Fire-and-forget: metering must never slow down or fail the user's request. */
export function recordAiUsage(row: UsageRow): void {
  query(
    `INSERT INTO ai_usage (user_id, feature, model, prompt_tokens, output_tokens, thought_tokens, total_tokens, latency_ms, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [row.userId, row.feature.slice(0, 60), row.model, row.promptTokens, row.outputTokens, row.thoughtTokens, row.totalTokens, row.latencyMs, row.status],
  ).catch((err) => console.error('[ai-usage] failed to record', (err as Error).message))
}

/**
 * Gemini 2.5 Flash list price (USD per 1M tokens): input $0.30 (text/image; PDFs count as image tokens),
 * output $2.50 — thinking tokens are billed as output. Override in .env if your contract differs.
 */
export const PRICING = {
  inputUsdPerM: Number(process.env.GEMINI_INPUT_USD_PER_M ?? '0.30') || 0.3,
  outputUsdPerM: Number(process.env.GEMINI_OUTPUT_USD_PER_M ?? '2.50') || 2.5,
  inrPerUsd: Number(process.env.INR_PER_USD ?? '88') || 88,
}

export function costInr(promptTokens: number, outputPlusThoughtTokens: number): number {
  const usd = (promptTokens * PRICING.inputUsdPerM + outputPlusThoughtTokens * PRICING.outputUsdPerM) / 1_000_000
  return usd * PRICING.inrPerUsd
}
