import Link from 'next/link'
import { notFound } from 'next/navigation'
import { QuestionList, SetSettings, VersionHistory, type QuestionData } from '@/components/admin/QuestionSetControls'
import { query, queryOne } from '@/lib/db'
import { readinessProblem } from '@/lib/eligibility-admin'
import { AREAS, areaLabel, type QuestionSet } from '@/lib/eligibility-sets'
import { listVersions } from '@/lib/versions'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata = { title: 'Edit question set' }

export default async function QuestionSetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const set = await queryOne<QuestionSet>(`SELECT * FROM question_sets WHERE id = $1`, [id])
  if (!set) notFound()
  const [questions, versions, problem] = await Promise.all([
    query<QuestionData>(`SELECT id, topic, text, options, correct, seconds, status FROM set_questions WHERE set_id = $1 ORDER BY position`, [id]),
    listVersions('question_set', id),
    readinessProblem(set),
  ])
  return (
    <>
      <div>
        <p className="small"><Link href="/admin/eligibility">← All question sets</Link></p>
        <h1 className="admin-h1">{set.name}</h1>
        <p className="muted small">{areaLabel(set.program_area)} · version {set.version}</p>
      </div>
      {problem && <p className={set.status === 'active' ? 'form-error' : 'help-note'}>{set.status === 'active' ? 'Needs attention: ' : 'Before activating: '}{problem}</p>}
      <SetSettings set={JSON.parse(JSON.stringify(set))} areas={AREAS} />
      <QuestionList setId={id} questions={questions} defaultSeconds={set.seconds_per_question} />
      <VersionHistory base={`/api/admin/eligibility/sets/${id}`} current={set.version} versions={JSON.parse(JSON.stringify(versions))} />
    </>
  )
}
