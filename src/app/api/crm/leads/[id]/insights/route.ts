import { leadFor, staffGuard } from '@/lib/crm/guard'
import { leadInsights } from '@/lib/crm/insights'
import { jsonError, jsonOk, rateLimit } from '@/lib/security'

/** The lead's intent score and its cached AI brief (no AI call). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await staffGuard(request, false)
  if (me instanceof Response) return me
  const lead = await leadFor(me, (await params).id)
  if (lead instanceof Response) return lead
  const r = await leadInsights(lead.id)
  if (!r) return jsonError(404, 'Lead not found.')
  return jsonOk({ intent: r.intent, summary: r.summary, generatedAt: r.generatedAt, stale: r.stale })
}

/** Builds the AI brief now (when it is missing or out of date, or with { force: true }). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await staffGuard(request)
  if (me instanceof Response) return me
  const lead = await leadFor(me, (await params).id)
  if (lead instanceof Response) return lead
  if (!(await rateLimit(`crm:insights:${me.id}`, 120, 3600))) return jsonError(429, 'Too many summaries in an hour. Please try again shortly.')
  const force = new URL(request.url).searchParams.get('force') === '1'
  try {
    const r = await leadInsights(lead.id, { withSummary: true, force })
    if (!r) return jsonError(404, 'Lead not found.')
    return jsonOk({ intent: r.intent, summary: r.summary, generatedAt: r.generatedAt, stale: false })
  } catch (err) {
    console.error('[crm] insights failed', (err as Error).message)
    return jsonError(502, 'Couldn’t write the summary just now. Please try again.')
  }
}
