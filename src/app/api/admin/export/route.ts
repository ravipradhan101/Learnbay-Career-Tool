import { getCurrentAdmin } from '@/lib/admin-auth'
import { parseRange, tokenUsage } from '@/lib/admin-reports'
import { csvResponse } from '@/lib/csv'

/** CSV export of the per-learner AI token report. */
export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) return new Response('Not found', { status: 404 })
  const url = new URL(request.url)
  if (url.searchParams.get('report') !== 'tokens') return new Response('Unknown report', { status: 400 })
  const range = parseRange(url.searchParams.get('range'))
  const t = await tokenUsage(range.since, (url.searchParams.get('q') ?? '').slice(0, 100))
  return csvResponse(
    `career-studio-ai-tokens-${range.key}-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Name', 'Email', 'AI calls', 'Skill Gap tokens', 'Salary tokens', 'Roadmap tokens', 'Resume review tokens', 'AI chat tokens', 'Total tokens', 'Estimated cost (INR)', 'Last used'],
    t.users.map((u) => [u.name, u.email, u.calls, u.skillGap, u.salary, u.roadmap, u.resume, u.assistant, u.total, u.costInr.toFixed(2), u.lastUsed]),
  )
}
