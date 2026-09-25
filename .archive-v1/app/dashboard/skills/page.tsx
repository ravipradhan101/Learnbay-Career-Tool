import { Icon } from '@/components/Icon'
import { SkillBars, TopGaps } from '@/components/report/Sections'
import { getReadyDashboard } from '@/lib/data'

export const metadata = { title: 'Skill Gap Analysis' }

export default async function SkillsPage() {
  const { report } = await getReadyDashboard()
  const r = report.data
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your Skill Gap Analysis</h1>
          <p>Here&apos;s how your current skills compare with {/^[aeiou]/i.test(r.recommendedPath.title) ? 'an' : 'a'} {r.recommendedPath.title} ({r.recommendedPath.subtitle}).</p>
        </div>
      </div>
      <section className="card"><SkillBars skills={r.skills} /></section>
      <section className="card stack">
        <h2 className="card-title"><Icon name="target" className="text-primary" /> Top Gaps to Focus On</h2>
        <TopGaps gaps={r.topGaps} />
      </section>
      <section className="card stack">
        <h2 className="card-title"><Icon name="code" className="text-primary" /> Tools & frameworks to learn</h2>
        <div className="tag-list">{r.tools.map((t) => <span className="pill primary" key={t}>{t}</span>)}</div>
      </section>
    </>
  )
}
