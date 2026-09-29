import Link from 'next/link'
import { Empty, PageHead, Stat, fmtDate, fmtInt } from '@/components/admin/parts'
import { TopicStatus } from '@/components/admin/TopicStatus'
import { getProgram } from '@/config/programs'
import { requireAdmin } from '@/lib/admin-auth'
import { parseRange } from '@/lib/admin-reports'
import { query } from '@/lib/db'

export const metadata = { title: 'Topic requests' }

const VERDICT: Record<string, string> = {
  covered: 'Told: trainers cover it',
  'not-needed': 'Told: not needed for their roles',
  'other-program': 'Pointed to another program',
}

/**
 * Topics learners asked about that the published syllabus doesn't list. When the counsellor told a learner that
 * trainers cover a topic, the team must either publish it (already taught) or add it to the course.
 */
export default async function TopicsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const range = parseRange((await searchParams).range)
  const rows = await query<{ id: string; user_id: string | null; name: string | null; email: string | null; program_id: string | null; topic: string; verdict: string; learner_message: string | null; status: string; created_at: Date }>(
    `SELECT t.id, t.user_id, u.name, u.email, t.program_id, t.topic, t.verdict, t.learner_message, t.status, t.created_at
       FROM topic_requests t LEFT JOIN users u ON u.id = t.user_id
      WHERE t.created_at >= $1
      ORDER BY (t.status = 'new' AND t.verdict = 'covered') DESC, t.created_at DESC LIMIT 300`,
    [range.since],
  )
  const promised = rows.filter((r) => r.verdict === 'covered' && r.status === 'new')
  const byTopic = new Map<string, number>()
  for (const r of rows) byTopic.set(r.topic.toLowerCase(), (byTopic.get(r.topic.toLowerCase()) ?? 0) + 1)
  const top = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <>
      <PageHead title="Topic requests" sub={`${range.label}. Topics learners asked about that the published syllabus doesn't list.`} range={range.key} base="/admin/topics" />
      <div className="stat-grid">
        <Stat label="Need a decision" value={fmtInt(promised.length)} note="Learner was told trainers cover it" />
        <Stat label="All requests" value={fmtInt(rows.length)} />
        <Stat label="Most asked" value={top[0] ? top[0][0] : '—'} note={top[0] ? `${top[0][1]} times` : undefined} />
      </div>
      {promised.length > 0 && (
        <p className="card" style={{ borderLeft: '4px solid #d97706', background: '#fff8eb' }}>
          <b>{promised.length} topic{promised.length === 1 ? '' : 's'} need a decision.</b> The counsellor told these learners our trainers cover the topic.
          If it is already taught, publish it on the course page and brochure; if not, add it to the course.
        </p>
      )}
      <section className="card stack">
        <h2 className="card-title">Requests</h2>
        {rows.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>When</th><th>Topic</th><th>Program</th><th>What the learner was told</th><th>Learner asked</th><th>Learner</th><th>Decision</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={r.verdict === 'covered' && r.status === 'new' ? { background: '#fff8eb' } : undefined}>
                    <td>{fmtDate(r.created_at)}</td>
                    <td><b>{r.topic}</b></td>
                    <td>{r.program_id ? getProgram(r.program_id).name : '—'}</td>
                    <td>{VERDICT[r.verdict] ?? r.verdict}</td>
                    <td style={{ minWidth: 220 }}>{r.learner_message ?? '—'}</td>
                    <td>{r.user_id ? <Link href={`/admin/users/${r.user_id}`}>{r.name || r.email}</Link> : '—'}</td>
                    <td><TopicStatus id={r.id} status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No topic requests in this period.</Empty>}
      </section>
    </>
  )
}
