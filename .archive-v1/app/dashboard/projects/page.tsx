import { Icon } from '@/components/Icon'
import { ProjectCards } from '@/components/report/Sections'
import { getProgram } from '@/config/programs'
import { getReadyDashboard } from '@/lib/data'
import { industryLabel } from '@/lib/questions'

export const metadata = { title: 'Projects & Portfolio' }

export default async function ProjectsPage() {
  const { report, answers } = await getReadyDashboard()
  const r = report.data
  const program = getProgram(r.recommendedProgramId)
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Projects & Portfolio</h1>
          <p>Projects tied to {industryLabel(answers) === 'Not specified' ? 'your domain' : industryLabel(answers)} that show hiring managers you can do the job.</p>
        </div>
      </div>
      <ProjectCards projects={r.projects} />
      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="bulb" className="text-primary" /> Portfolio tips</h2>
          <ul className="list-check">{r.portfolioTips.map((t) => <li key={t}><Icon name="checkCircle" size="1.1rem" />{t}</li>)}</ul>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="award" className="text-primary" /> How Learnbay helps build your portfolio</h2>
          <p className="small muted">{program.summary}</p>
          <ul className="list-check">{program.features.map((f) => <li key={f}><Icon name="check" size="1.1rem" />{f}</li>)}</ul>
        </section>
      </div>
    </>
  )
}
