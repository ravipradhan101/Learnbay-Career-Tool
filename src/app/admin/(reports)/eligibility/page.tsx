import Link from 'next/link'
import { Empty, Stat, fmtDate, fmtInt } from '@/components/admin/parts'
import { NewSetForm, SetStatusToggle, TestVisibilityToggle } from '@/components/admin/QuestionSetControls'
import { query } from '@/lib/db'
import { recentAttempts, setStats } from '@/lib/eligibility-admin'
import { AREAS, areaLabel, ensureQuestionSets, isEligibilityEnabled, type QuestionSet } from '@/lib/eligibility-sets'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata = { title: 'Eligibility test' }

export default async function EligibilityAdminPage() {
  await requireAdmin()
  await ensureQuestionSets()
  const [enabled, sets, stats, recent] = await Promise.all([
    isEligibilityEnabled(),
    query<QuestionSet & { active_q: number; total_q: number }>(
      `SELECT s.*, (SELECT count(*)::int FROM set_questions q WHERE q.set_id = s.id AND q.status = 'active') AS active_q,
              (SELECT count(*)::int FROM set_questions q WHERE q.set_id = s.id) AS total_q
         FROM question_sets s ORDER BY s.status, s.program_area, s.updated_at DESC`,
    ),
    setStats(),
    recentAttempts(30),
  ])
  const byId = Object.fromEntries(stats.map((s) => [s.set_id, s]))
  // Which set each program area actually uses right now (newest active one for the area, else newest "all areas" set).
  const live = new Set<string>()
  for (const area of AREAS.filter((a) => a.id !== 'any')) {
    const pick = sets.filter((s) => s.status === 'active' && (s.program_area === area.id || s.program_area === 'any'))
      .sort((a, b) => Number(b.program_area === area.id) - Number(a.program_area === area.id) || +new Date(b.updated_at) - +new Date(a.updated_at))[0]
    if (pick) live.add(pick.id)
  }
  const uncovered = AREAS.filter((a) => a.id !== 'any' && !sets.some((s) => s.status === 'active' && (s.program_area === a.id || s.program_area === 'any')))
  const totalAttempts = stats.reduce((n, s) => n + s.attempts, 0)

  return (
    <>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="admin-h1">Eligibility test</h1>
          <p className="muted small">Question sets, timing and attempts. Nothing is deleted: pause a question or a set instead. Every change is kept as a version you can restore.</p>
        </div>
        <TestVisibilityToggle enabled={enabled} />
      </div>
      {enabled && uncovered.length > 0 && (
        <p className="form-error">No active set for: {uncovered.map((a) => a.label).join(', ')}. Learners in these areas won&apos;t see the test.</p>
      )}
      <div className="stat-grid">
        <Stat label="Question sets" value={fmtInt(sets.length)} note={`${sets.filter((s) => s.status === 'active').length} active`} />
        <Stat label="Tests completed" value={fmtInt(totalAttempts)} />
        <Stat label="Learners tested" value={fmtInt(stats.reduce((n, s) => n + s.learners, 0))} />
      </div>

      <section className="card stack">
        <h2 className="card-title">Question sets</h2>
        <div className="table-scroll">
          <table className="admin-table compact">
            <thead><tr><th>Set</th><th>Program area</th><th>Questions</th><th className="num">Per test</th><th className="num">Time</th><th className="num">Attempts</th><th className="num">Taken</th><th className="num">Avg score</th><th>Status</th><th /></tr></thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/admin/eligibility/${s.id}`}><b>{s.name}</b></Link><div className="muted small">v{s.version} · updated {fmtDate(s.updated_at)}</div></td>
                  <td className="small">{areaLabel(s.program_area)}</td>
                  <td className="small">{s.source === 'ai' ? 'AI-generated' : 'From this set'} · {s.active_q}/{s.total_q} active</td>
                  <td className="num">{s.questions_per_test}</td>
                  <td className="num">{s.seconds_per_question}s · {Math.round(s.total_seconds / 6) / 10} min</td>
                  <td className="num">{s.max_attempts}</td>
                  <td className="num">{fmtInt(byId[s.id]?.attempts ?? 0)}</td>
                  <td className="num">{byId[s.id]?.avg_score ?? '—'}</td>
                  <td>
                    <span className={`pill ${s.status === 'active' ? 'success' : 'warning'}`}>{s.status === 'active' ? 'Active' : 'Paused'}</span>
                    {live.has(s.id) && <span className="pill primary" style={{ marginLeft: '0.25rem' }}>Live</span>}
                  </td>
                  <td className="num"><SetStatusToggle id={s.id} status={s.status} /><Link href={`/admin/eligibility/${s.id}`} className="btn btn-ghost btn-sm">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="help-note">“Live” marks the set learners actually get. If a program area has several active sets, the one made for that area wins, then the most recently updated.</p>
      </section>

      <section className="card stack">
        <h2 className="card-title">Add a new question set</h2>
        <NewSetForm areas={AREAS} sets={sets.map((s) => ({ id: s.id, name: s.name }))} />
      </section>

      <section className="card stack">
        <h2 className="card-title">Latest results</h2>
        {recent.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Learner</th><th className="num">Attempt</th><th className="num">Score</th><th>Set</th><th>Questions</th><th>When</th></tr></thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i}>
                    <td><Link href={`/admin/users/${r.user_id}`}>{r.name || r.email}</Link></td>
                    <td className="num">{r.attempt}</td>
                    <td className="num"><b>{r.score}</b>/100</td>
                    <td className="small">{r.set_name ?? '—'}</td>
                    <td className="small">{r.source === 'ai' ? 'AI-generated' : 'From the set'}</td>
                    <td className="small">{fmtDate(r.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No completed tests yet.</Empty>}
      </section>
    </>
  )
}
