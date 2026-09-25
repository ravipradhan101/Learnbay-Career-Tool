import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { PrintButton } from '@/components/PrintButton'
import { ProjectCards, RoadmapTimeline, SkillBars, TopGaps, formatLpa } from '@/components/report/Sections'
import { getProgram } from '@/config/programs'
import { getResources } from '@/config/resources'
import { getDashboardData } from '@/lib/data'
import { displayRole, experienceLabel, industryLabel } from '@/lib/questions'

export const metadata: Metadata = { title: 'My AI Career Report', robots: { index: false, follow: false } }

export default async function PrintPage() {
  const data = await getDashboardData()
  if ('notReady' in data) redirect('/dashboard')
  const { user, answers, report } = data
  const r = report.data
  const program = getProgram(r.recommendedProgramId)
  return (
    <main className="print-page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Logo href="/dashboard" />
        <PrintButton />
      </div>
      <header className="stack" style={{ gap: '0.375rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>AI Career Report — {user.name}</h1>
        <p className="muted">
          {displayRole(answers, r.currentRoleLabel)} • {experienceLabel(answers)} • {industryLabel(answers)} → {r.recommendedPath.title} ({r.recommendedPath.subtitle})
        </p>
        <p className="muted small">Generated {new Date(report.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </header>
      <section className="card stack">
        <h2 className="card-title">Summary</h2>
        <p>{r.profileSummary}</p>
        <p className="small"><b>AI Readiness:</b> {r.readiness.score}/100 ({r.readiness.band}) — {r.readiness.summary}</p>
        <p className="small"><b>Potential growth:</b> +{r.potentialGrowth.minPercent}-{r.potentialGrowth.maxPercent}% (indicative)</p>
      </section>
      <section className="card stack">
        <h2 className="card-title">Your {r.roadmap.durationMonths}-Month Roadmap ({r.roadmap.weeklyHours})</h2>
        <RoadmapTimeline roadmap={r.roadmap} />
      </section>
      <section className="card stack">
        <h2 className="card-title">Skill Gap Analysis</h2>
        <SkillBars skills={r.skills} />
        <TopGaps gaps={r.topGaps} />
      </section>
      <section className="stack">
        <h2 className="card-title">Recommended Projects</h2>
        <ProjectCards projects={r.projects} />
      </section>
      <section className="card stack">
        <h2 className="card-title">Salary Insights (indicative)</h2>
        <ul className="list-num">{r.salary.targetRoles.map((t) => <li key={t.role}>{t.role}: {formatLpa(t.minLpa)} – {formatLpa(t.maxLpa)}</li>)}</ul>
        <p className="small muted">{r.salary.note}</p>
      </section>
      <section className="card stack">
        <h2 className="card-title">Recommended Program: {program.name}</h2>
        <ul className="list-num">{r.whyThisTrack.map((w) => <li key={w}>{w}</li>)}</ul>
        <p className="small">{program.url}</p>
      </section>
      <section className="card stack">
        <h2 className="card-title">Resources</h2>
        <ul className="list-num">{getResources(r.resourceIds).map((res) => <li key={res.id}>{res.title} ({res.provider}) — {res.url}</li>)}</ul>
      </section>
      <section className="card stack">
        <h2 className="card-title">Next steps</h2>
        <ol className="list-num">{r.nextSteps.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>
      <p className="xsmall muted">AI-generated guidance by Learnbay AI Career Navigator. Salary figures are indicative market ranges, not guarantees.</p>
    </main>
  )
}
