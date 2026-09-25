import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { getProgram, PROGRAMS } from '@/config/programs'
import { getReadyDashboard } from '@/lib/data'

export const metadata = { title: 'Recommended Program' }

export default async function ProgramPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ report }, params] = await Promise.all([getReadyDashboard(), searchParams])
  const r = report.data
  const program = getProgram(r.recommendedProgramId)
  const showCompare = params.compare === '1'
  const { totalGaps, programCovers, genericCovers, genericMisses } = r.coverage
  const others = PROGRAMS.filter((p) => p.id !== program.id)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recommended for you</h1>
          <p>Based on your profile, goals and skill gaps.</p>
        </div>
      </div>

      <div className="grid-2">
        <section className="program-hero">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>{program.name}</h2>
            <span className="pill solid">Best Fit</span>
          </div>
          <p className="small muted">{program.summary}</p>
          <ul className="list-check">{program.features.map((f) => <li key={f}><Icon name="checkCircle" size="1.1rem" />{f}</li>)}</ul>
          <div className="stack" style={{ gap: '0.5rem' }}>
            <a href={program.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">
              View Program Details <Icon name="arrowRight" size="1rem" />
            </a>
            <Link href={showCompare ? '/dashboard/program' : '/dashboard/program?compare=1#compare'} className="btn btn-outline btn-block" scroll={false}>
              {showCompare ? 'Hide comparison' : 'Compare with Other Tracks'}
            </Link>
          </div>
        </section>
        <section className="card stack">
          <h2 className="card-title">Why this track?</h2>
          <ul className="list-check">{r.whyThisTrack.map((w) => <li key={w}><Icon name="checkCircle" size="1.1rem" />{w}</li>)}</ul>
        </section>
      </div>

      <section className="card stack">
        <h2 className="card-title"><Icon name="target" className="text-primary" /> Specialized vs generic: your {totalGaps} skill gaps</h2>
        <div className="coverage">
          <div className="coverage-row">
            <span><b>{program.name}</b></span><b>{programCovers}/{totalGaps}</b>
            <div className="coverage-bar"><i style={{ width: `${(programCovers / totalGaps) * 100}%` }} /></div>
          </div>
          <div className="coverage-row">
            <span>A generic online AI course</span><b className="muted">{genericCovers}/{totalGaps}</b>
            <div className="coverage-bar"><i className="generic" style={{ width: `${(genericCovers / totalGaps) * 100}%` }} /></div>
          </div>
        </div>
        {genericMisses.length > 0 && (
          <p className="small muted">What a generic course usually leaves out for you: <b style={{ color: 'var(--ink-2)' }}>{genericMisses.join(', ')}</b>.</p>
        )}
        <p className="xsmall muted">AI estimate based on your skill gaps and each program&apos;s published focus areas.</p>
      </section>

      {showCompare && (
        <section className="card stack" id="compare">
          <h2 className="card-title">Compare with other Learnbay tracks</h2>
          <div className="table-scroll">
            <table className="compare-table">
              <thead><tr><th>Program</th><th>Best for</th><th>Highlights</th><th /></tr></thead>
              <tbody>
                {[program, ...others].map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b>{p.id === program.id && <><br /><span className="pill solid" style={{ marginTop: '0.25rem' }}>Best fit for you</span></>}</td>
                    <td className="small muted">{p.bestFor}</td>
                    <td className="small">{p.features.join(' • ')}</td>
                    <td><a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Details <Icon name="external" size="0.85rem" /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card row" style={{ justifyContent: 'space-between' }}>
        <div>
          <b>Questions about fees, EMI or batch timings?</b>
          <p className="small muted">A Learnbay career counselor can walk you through the program and the best time for you to start.</p>
        </div>
        <Link href="/dashboard/counselor" className="btn btn-primary"><Icon name="phone" size="1rem" /> Talk to a Counselor</Link>
      </section>
    </>
  )
}
