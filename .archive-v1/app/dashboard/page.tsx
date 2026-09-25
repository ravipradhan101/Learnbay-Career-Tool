import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { ReportActions } from '@/components/dashboard/ReportActions'
import { RoadmapTimeline } from '@/components/report/Sections'
import { getProgram } from '@/config/programs'
import { getDashboardData } from '@/lib/data'
import { displayRole, experienceLabel, industryLabel } from '@/lib/questions'
import { firstName } from '@/lib/validation'

export default async function DashboardPage() {
  const data = await getDashboardData()
  if ('notReady' in data) return null
  const { user, answers, report } = data
  const r = report.data
  const program = getProgram(r.recommendedProgramId)

  const tiles = [
    { href: '/dashboard/roadmap', title: 'Career Roadmap', sub: `${r.roadmap.durationMonths} month plan` },
    { href: '/dashboard/skills', title: 'Skill Gap Analysis', sub: `${r.topGaps.length} key gaps` },
    { href: '/dashboard/projects', title: 'Projects & Portfolio', sub: `${r.projects.length} recommended` },
    { href: '/dashboard/salary', title: 'Salary Insights', sub: 'Market benchmark' },
    { href: '/dashboard/program', title: 'Recommended Program', sub: 'Best fit for you' },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hi {firstName(user.name)} <span aria-hidden="true">👋</span></h1>
          <p>Here&apos;s your personalized AI career report</p>
        </div>
        <ReportActions shared={Boolean(report.share_token)} />
      </div>

      <section className="card">
        <div className="path-row">
          <div className="path-box">
            <span className="xsmall">Current Role</span>
            <h3>{displayRole(answers, r.currentRoleLabel)}</h3>
            <p className="small muted">{experienceLabel(answers)} • {industryLabel(answers)}</p>
          </div>
          <span className="path-arrow" aria-hidden="true"><Icon name="arrowRight" size="1.75rem" /></span>
          <div className="path-box primary">
            <span className="xsmall">Recommended Path</span>
            <h3>{r.recommendedPath.title}</h3>
            <p className="small" style={{ opacity: 0.9 }}>{r.recommendedPath.subtitle}</p>
          </div>
          <span className="path-arrow" aria-hidden="true"><Icon name="arrowRight" size="1.75rem" /></span>
          <div className="path-box growth">
            <div>
              <span className="xsmall">Potential Growth</span>
              <p className="growth-num">+{r.potentialGrowth.minPercent}-{r.potentialGrowth.maxPercent}%</p>
              <p className="xsmall muted">(Indicative)</p>
            </div>
            <span className="mini-bars" aria-hidden="true" style={{ height: '2.5rem' }}>
              <i style={{ height: '30%', background: 'var(--success)' }} /><i style={{ height: '50%', background: 'var(--success)' }} />
              <i style={{ height: '70%', background: 'var(--success)' }} /><i style={{ height: '100%', background: 'var(--success)' }} />
            </span>
          </div>
        </div>
        {r.profileSummary && <p className="muted" style={{ marginTop: '1rem' }}>{r.profileSummary}</p>}
      </section>

      <nav className="tiles" aria-label="Report sections">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="tile-link"><b>{t.title}</b><span>{t.sub}</span></Link>
        ))}
      </nav>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="card-title">Your {r.roadmap.durationMonths}-Month Career Roadmap</h2>
          <span className="pill primary">{r.roadmap.weeklyHours}</span>
        </div>
        <RoadmapTimeline roadmap={r.roadmap} />
      </section>

      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="target" className="text-primary" /> AI Readiness</h2>
          <div className="score-row">
            <div className="score-ring" style={{ ['--v' as string]: r.readiness.score }}>
              <div><b>{r.readiness.score}</b><small>/100</small></div>
            </div>
            <div className="stack" style={{ gap: '0.375rem', flex: 1, minWidth: '12rem' }}>
              <span className="pill primary" style={{ alignSelf: 'flex-start' }}>{r.readiness.band}</span>
              <p className="small muted">{r.readiness.summary}</p>
            </div>
          </div>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="sparkles" className="text-primary" /> How AI is changing your role</h2>
          <p className="small muted">{r.aiImpact.summary}</p>
          <ul className="impact-list">
            {r.aiImpact.tasks.map((t) => (
              <li key={t.task}>
                <span>{t.task}</span>
                <span className={`pill ${t.impact === 'Automated' ? 'danger' : t.impact === 'AI-assisted' ? 'warning' : 'success'}`}>{t.impact}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid-2">
        <section className="card stack">
          <h2 className="card-title"><Icon name="checkCircle" className="text-primary" /> Your next steps this week</h2>
          <ol className="list-num">{r.nextSteps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
        <section className="card stack">
          <h2 className="card-title"><Icon name="award" className="text-primary" /> Best fit for you</h2>
          <p style={{ fontWeight: 700 }}>{program.name}</p>
          <p className="small muted">{program.summary}</p>
          <div className="row">
            <Link href="/dashboard/program" className="btn btn-primary btn-sm">Why this track <Icon name="arrowRight" size="0.9rem" /></Link>
            <Link href="/dashboard/counselor" className="btn btn-outline btn-sm">Talk to a Counselor</Link>
          </div>
        </section>
      </div>
    </>
  )
}
