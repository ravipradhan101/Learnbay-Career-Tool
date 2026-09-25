import Link from 'next/link'
import { Empty, Stat, fmtDate, fmtInt } from '@/components/admin/parts'
import { NewFlowForm, FlowStatusToggle, RestoreDeletedFlow } from '@/components/admin/EmailFlowControls'
import { ensureFlowBaselines } from '@/lib/email/admin'
import { orphanedVersions } from '@/lib/versions'
import { TRIGGERS } from '@/lib/email/catalog'
import { emailOverview } from '@/lib/email/reports'

export const metadata = { title: 'Emails' }

export default async function EmailsPage() {
  await ensureFlowBaselines()
  const [{ stats, flows }, deleted] = await Promise.all([emailOverview(), orphanedVersions('email_flow', 'email_flows')])
  const smtpReady = Boolean(process.env.SMTP_HOST) && process.env.MAIL_LOG_ONLY !== 'true'
  return (
    <>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="admin-h1">Email automation</h1>
          <p className="muted small">Lifecycle emails that welcome, nurture and bring learners back. Each flow starts on a trigger and sends its emails in order.</p>
        </div>
        <Link href="/admin/emails/log" className="btn btn-outline btn-sm">Send log</Link>
      </div>
      {!smtpReady && <p className="form-error">Emails are not being delivered: SMTP is not configured, or MAIL_LOG_ONLY is on. Flows still run and appear in the send log.</p>}
      <div className="stat-grid">
        <Stat label="Sent (7 days)" value={fmtInt(stats.sent7)} note={`${fmtInt(stats.sent30)} in 30 days`} />
        <Stat label="Failed (30 days)" value={fmtInt(stats.failed30)} note="See the send log for reasons" />
        <Stat label="Learners in a flow now" value={fmtInt(stats.active)} />
        <Stat label="Unsubscribed" value={fmtInt(stats.unsubscribed)} note={`${fmtInt(stats.unsub30)} in the last 30 days`} />
      </div>

      <section className="card stack">
        <h2 className="card-title">Flows</h2>
        {flows.length ? (
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>Flow</th><th>Starts when</th><th className="num">Emails</th><th className="num">In flow now</th><th className="num">Entered (30d)</th><th className="num">Sent (30d)</th><th className="num">Reached goal</th><th>Status</th><th /></tr></thead>
              <tbody>
                {flows.map((f) => (
                  <tr key={f.id}>
                    <td><Link href={`/admin/emails/${f.id}`}><b>{f.name}</b></Link>{f.description && <div className="muted small">{f.description}</div>}</td>
                    <td className="small">{TRIGGERS.find((t) => t.id === f.trigger)?.label ?? f.trigger}</td>
                    <td className="num">{f.activeSteps}/{f.steps}</td>
                    <td className="num">{fmtInt(f.activeEnrolled)}</td>
                    <td className="num">{fmtInt(f.entered30)}</td>
                    <td className="num">{fmtInt(f.sent30)}</td>
                    <td className="num">{fmtInt(f.goalExits)}</td>
                    <td><FlowStatusToggle id={f.id} status={f.status} /></td>
                    <td><Link href={`/admin/emails/${f.id}`} className="btn btn-ghost btn-sm">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No flows yet. The starter flows are created automatically within a minute of the server starting.</Empty>}
        <p className="help-note">Updated {fmtDate(new Date())}. Emails after the first in a flow are only sent between 9am and 8pm IST, and at most one nurture email reaches a learner every 20 hours, whatever the flow settings.</p>
      </section>

      {deleted.length > 0 && (
        <section className="card stack">
          <h2 className="card-title">Deleted flows</h2>
          <p className="card-sub">Every flow keeps its backups after it is deleted. Restore brings it back paused.</p>
          <table className="admin-table compact">
            <thead><tr><th>Flow</th><th>Deleted</th><th /></tr></thead>
            <tbody>
              {deleted.map((d) => (
                <tr key={d.entity_id}>
                  <td>{d.snapshot?.flow?.name ?? 'Untitled flow'}</td>
                  <td className="small">{fmtDate(d.created_at)}</td>
                  <td className="num"><RestoreDeletedFlow id={d.entity_id} version={d.version} name={d.snapshot?.flow?.name ?? 'this flow'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card stack">
        <h2 className="card-title">Create a new flow</h2>
        <NewFlowForm />
      </section>
    </>
  )
}
