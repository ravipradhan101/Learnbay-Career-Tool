import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { RoadmapTimeline } from '@/components/report/Sections'
import { getProgram } from '@/config/programs'
import { getReadyDashboard } from '@/lib/data'

export const metadata = { title: 'Career Roadmap' }

export default async function RoadmapPage() {
  const { report } = await getReadyDashboard()
  const r = report.data
  const program = getProgram(r.recommendedProgramId)
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your {r.roadmap.durationMonths}-Month Career Roadmap</h1>
          <p>To become {/^[aeiou]/i.test(r.recommendedPath.title) ? 'an' : 'a'} {r.recommendedPath.title} ({r.recommendedPath.subtitle}), paced at {r.roadmap.weeklyHours}.</p>
        </div>
      </div>
      <section className="card"><RoadmapTimeline roadmap={r.roadmap} /></section>
      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="target" className="text-primary" /> Best-fit roles for you</h2>
          <ul className="impact-list">
            {r.bestFitRoles.map((role) => (
              <li key={role.title} style={{ alignItems: 'flex-start' }}>
                <span><b>{role.title}</b><br /><span className="small muted">{role.why}</span></span>
                <span className={`pill ${role.fit === 'High' ? 'success' : role.fit === 'Medium' ? 'primary' : 'warning'}`}>{role.fit} fit</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="code" className="text-primary" /> Tools you&apos;ll learn</h2>
          <div className="tag-list">{r.tools.map((t) => <span className="pill primary" key={t}>{t}</span>)}</div>
          <p className="small muted">Following this roadmap on your own works. With a mentor, structured projects and reviews, the {program.name} covers this path end to end.</p>
          <Link href="/dashboard/program" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>See how the program maps <Icon name="arrowRight" size="0.9rem" /></Link>
        </section>
      </div>
    </>
  )
}
