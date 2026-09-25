import { getCurrentAdmin } from '@/lib/admin-auth'
import { csvCell } from '@/lib/csv'
import { listLeads } from '@/lib/leads'

export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) return new Response('Not found', { status: 404 })
  const search = new URL(request.url).searchParams.get('q') ?? ''
  const leads = await listLeads(search.slice(0, 100), 10_000)
  const columns: [string, (l: (typeof leads)[number]) => unknown][] = [
    ['Created', (l) => l.createdAt], ['Name', (l) => l.name], ['Email', (l) => l.email], ['Phone', (l) => l.phone],
    ['Lead score', (l) => l.score], ['Temperature', (l) => l.temperature], ['Role', (l) => l.role], ['Experience', (l) => l.experience],
    ['Codes at work', (l) => l.codes], ['Program interest', (l) => l.interest], ['Target role', (l) => l.targetRole], ['CTC', (l) => l.ctc],
    ['City', (l) => l.city], ['Weekly hours', (l) => l.weeklyHours], ['Timeline', (l) => l.timeline], ['Tools completed', (l) => l.tools],
    ['Readiness', (l) => l.readiness], ['Program', (l) => l.program], ['Resume score', (l) => l.resumeScore], ['Eligibility score', (l) => l.eligibilityScore], ['Email confirmed', (l) => (l.verified ? 'Yes' : 'No')], ['Unsubscribed', (l) => (l.emailsOff ? 'Yes' : 'No')], ['Chat questions', (l) => l.chatQuestions],
    ['Session request', (l) => l.session], ['Engagement', (l) => l.events], ['Source', (l) => l.source],
  ]
  const lines = [columns.map(([h]) => csvCell(h)).join(','), ...leads.map((l) => columns.map(([, get]) => csvCell(get(l))).join(','))]
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="career-studio-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
