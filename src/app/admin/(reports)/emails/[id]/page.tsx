import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FlowSettings, StepList } from '@/components/admin/EmailFlowControls'
import { VersionHistory } from '@/components/admin/QuestionSetControls'
import { ensureFlowBaselines } from '@/lib/email/admin'
import { listVersions } from '@/lib/versions'
import { flowDetail } from '@/lib/email/reports'

export const metadata = { title: 'Edit email flow' }

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await ensureFlowBaselines()
  const data = await flowDetail(id)
  if (!data) notFound()
  const versions = await listVersions('email_flow', id)
  const { flow, steps } = data
  return (
    <>
      <div>
        <p className="small"><Link href="/admin/emails">← All flows</Link></p>
        <h1 className="admin-h1">{flow.name}</h1>
      </div>
      <FlowSettings flow={{ id: flow.id, name: flow.name, description: flow.description, trigger: flow.trigger, status: flow.status, reentry_days: flow.reentry_days, exit_on: flow.exit_on }} />
      <StepList flowId={flow.id} steps={JSON.parse(JSON.stringify(steps))} />
      <VersionHistory base={`/api/admin/emails/flows/${id}`} what="email flow" versions={JSON.parse(JSON.stringify(versions))} />
      <p className="help-note">Changes apply to learners already in the flow from their next email. Pausing an email skips it; pausing the flow holds everyone where they are until you resume.</p>
    </>
  )
}
