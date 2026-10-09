import Link from 'next/link'
import { Empty, PageHead, Stat, fmtDate, fmtInt } from '@/components/admin/parts'
import { requireAdmin } from '@/lib/admin-auth'
import { parseRange } from '@/lib/admin-reports'
import { getCounsellor } from '@/lib/counsellors'
import { DEMO_RATINGS, demoRatingsOn, reviewReport } from '@/lib/reviews'

export const metadata = { title: 'Reviews & suggestions' }

const starsOf = (n: number | null) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—')

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const range = parseRange((await searchParams).range)
  const r = await reviewReport(range.since)
  const total = r.latest.length
  const avg = total ? r.latest.reduce((s, x) => s + x.rating, 0) / total : null
  const withSuggestion = r.latest.filter((x) => x.suggestion).length

  return (
    <>
      <PageHead title="Reviews & suggestions" sub={`${range.label}. What learners said in Bruce's feedback pop-up (asked after a few steps, or when they leave).`} range={range.key} base="/admin/reviews" />
      {demoRatingsOn() && (
        <div className="card demo-banner" role="note">
          <b>Demo ratings are ON (prototype data).</b> Learners see starting ratings for each counsellor ({Object.entries(DEMO_RATINGS).map(([id, r]) => `${getCounsellor(id).name} ${r.avg} from ${fmtInt(r.count)}`).join(' · ')}), blended with real reviews. Set <code>DEMO_RATINGS=false</code> in the environment before real learners use the app; the figures below are real reviews only.
        </div>
      )}
      <div className="stat-grid">
        <Stat label="Reviews" value={fmtInt(total)} note={total >= 200 ? 'showing the latest 200' : undefined} />
        <Stat label="Avg counsellor rating" value={avg ? `${avg.toFixed(2)} / 5` : '—'} />
        <Stat label="Avg eligibility test rating" value={r.test?.avg ? `${Number(r.test.avg).toFixed(2)} / 5` : '—'} note={`${fmtInt(r.test?.count ?? 0)} ratings`} />
        <Stat label="With a suggestion" value={fmtInt(withSuggestion)} />
      </div>

      <section className="card stack">
        <h2 className="card-title">By counsellor</h2>
        {r.byCounsellor.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Counsellor</th><th className="num">Reviews</th><th className="num">Average</th><th className="num">1-2 stars</th></tr></thead>
              <tbody>
                {r.byCounsellor.map((c) => (
                  <tr key={c.counsellor}><td><b>{getCounsellor(c.counsellor).name}</b></td><td className="num">{fmtInt(c.count)}</td><td className="num">{Number(c.avg).toFixed(2)}</td><td className="num">{fmtInt(c.low)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No reviews in this period.</Empty>}
      </section>

      <section className="card stack">
        <h2 className="card-title">Latest reviews</h2>
        {total ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>When</th><th>Learner</th><th>Counsellor</th><th>Counsellor rating</th><th>Test rating</th><th>Suggestion</th></tr></thead>
              <tbody>
                {r.latest.map((x) => (
                  <tr key={x.id}>
                    <td>{fmtDate(x.updated_at)}</td>
                    <td><Link href={`/admin/users/${x.user_id}`}>{x.name || x.email}</Link></td>
                    <td>{getCounsellor(x.counsellor).name}</td>
                    <td style={{ color: '#d97706', whiteSpace: 'nowrap' }}>{starsOf(x.rating)}</td>
                    <td style={{ color: '#d97706', whiteSpace: 'nowrap' }}>{starsOf(x.test_rating)}</td>
                    <td style={{ minWidth: 240 }}>{x.suggestion ?? <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No reviews yet.</Empty>}
      </section>
    </>
  )
}
