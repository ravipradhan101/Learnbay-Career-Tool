import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/Icon'
import { SiteHeader } from '@/components/SiteHeader'
import { Testimonials } from '@/components/Testimonials'
import { ProgramFitCard, RoadmapView, SalaryView, SkillGapView } from '@/components/tools/ToolViews'
import { LearnbayPitch } from '@/components/usp/UspNote'
import type { ProgramFit } from '@/lib/tool-types'
import { queryOne } from '@/lib/db'
import { getTool, type ToolId } from '@/lib/tools-meta'
import { firstName } from '@/lib/validation'
import type { RoadmapResult, SalaryResult, SkillGapResult } from '@/lib/tool-types'

export const metadata: Metadata = { title: 'Shared career analysis', robots: { index: false, follow: false } }

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) notFound()
  const row = await queryOne<{ tool: ToolId; data: unknown; name: string | null }>(
    `SELECT t.tool, t.data, u.name FROM tool_results t JOIN users u ON u.id = t.user_id WHERE t.share_token = $1 AND t.status = 'ready'`,
    [token],
  )
  if (!row) notFound()
  const meta = getTool(row.tool)!
  // Shared views never include contact details, answers or current salary.
  return (
    <>
      <SiteHeader />
      <main className="container stack" style={{ paddingBlock: '2rem 7rem', gap: '1.25rem' }}>
        <div>
          <span className="eyebrow">Shared from Learnbay Career Studio</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginTop: '0.375rem' }}>{firstName(row.name)}&apos;s {meta.name}</h1>
        </div>
        {row.tool === 'skill-gap' && <SkillGapView r={row.data as SkillGapResult} shared />}
        {row.tool === 'salary' && <SalaryView r={row.data as SalaryResult} current={null} shared />}
        {row.tool === 'roadmap' && <RoadmapView r={row.data as RoadmapResult} shared />}
        {/* The recommended program and Learnbay's approach, kept below the report so the report stays the focus. */}
        <ProgramFitCard fit={row.data as ProgramFit} />
        <LearnbayPitch toolId={row.tool} ids={row.tool === 'salary' ? ['placement', 'domain', 'projects', 'certification'] : row.tool === 'roadmap' ? ['mentors', 'hybrid', 'projects', 'placement'] : ['customisation', 'projects', 'domain', 'mentors']} />
        <section className="cta-band">
          <div>
            <h2>Get your own {meta.name}</h2>
            <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>Personalised to your role and goals • about 2 minutes • free</p>
          </div>
          <Link href={`/start?tool=${row.tool}`} className="btn btn-primary btn-lg">Start My Free Analysis</Link>
        </section>
        <Testimonials />
      </main>
    </>
  )
}
