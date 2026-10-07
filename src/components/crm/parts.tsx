import Link from 'next/link'
import { fmtDate } from '@/components/admin/parts'
import { ACTOR_LABEL, ROLE_LABEL, statusLabel, TASK_KIND_LABEL, outcomeLabel, type ActorKind } from '@/lib/crm/roles'
import { displayName, type StaffRow } from '@/lib/crm/scope'
import type { TaskRow } from '@/lib/crm/data'
import { CompleteTask } from './CompleteTask'

export function ActorBadge({ kind }: { kind: ActorKind }) {
  return <span className={`crm-role crm-role-${kind}`}>{ACTOR_LABEL[kind]}</span>
}

/** A person with their role; independent associates (no manager) get a star. */
export function Person({ s, role = true }: { s: StaffRow | null | undefined; role?: boolean }) {
  if (!s) return <span className="muted">Unassigned</span>
  const independent = s.role === 'associate' && !s.manager_id
  return (
    <span className="crm-person" title={`${s.email}${independent ? ' · independent associate' : ''}`}>
      {displayName(s)}{independent && <span className="crm-star" aria-label="Independent associate">★</span>}
      {role && <span className={`crm-role crm-role-${s.role}`}>{ROLE_LABEL[s.role]}</span>}
      {!s.active && <span className="pill danger">Inactive</span>}
    </span>
  )
}

/** Owner → associate → manager: who answers for a lead or a missed call. */
export function Chain({ chain }: { chain: { owner: StaffRow | null; associate: StaffRow | null; manager: StaffRow | null } }) {
  return (
    <span className="crm-chain">
      <Person s={chain.owner} />
      {chain.associate && <><span aria-hidden="true">→</span><Person s={chain.associate} /></>}
      {chain.manager && <><span aria-hidden="true">→</span><Person s={chain.manager} /></>}
    </span>
  )
}

export function StatusPill({ status }: { status: string | null }) {
  const s = status ?? 'new'
  const tone = s === 'enrolled' ? 'success' : s === 'interested' ? 'primary' : s === 'not_interested' || s === 'lost' ? 'danger' : s === 'contacted' ? 'warning' : ''
  return <span className={`pill ${tone}`}>{statusLabel(s)}</span>
}

export function relative(d: Date | string | null): string {
  if (!d) return '—'
  const mins = Math.round((new Date(d).getTime() - Date.now()) / 60_000)
  const abs = Math.abs(mins)
  const text = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`
  return mins >= 0 ? `in ${text}` : `${text} ago`
}

/** Calls and reminders, with "log outcome" right in the row. */
export function TaskTable({ tasks, people, showLead = true, showOwner = true, canAct = true }: {
  tasks: TaskRow[]; people: Map<string, StaffRow>; showLead?: boolean; showOwner?: boolean; canAct?: boolean
}) {
  if (!tasks.length) return <p className="muted small">Nothing here.</p>
  return (
    <div className="table-scroll">
      <table className="admin-table compact">
        <thead><tr>{showLead && <th>Lead</th>}<th>What</th><th>Due</th>{showOwner && <th>Owner</th>}<th>Status</th>{canAct && <th aria-label="Actions" />}</tr></thead>
        <tbody>
          {tasks.map((t) => {
            const late = t.status === 'open' && new Date(t.due_at).getTime() < Date.now()
            return (
              <tr key={t.id} className={t.missed ? 'crm-missed' : undefined}>
                {showLead && (
                  <td><Link href={`/admin/crm/leads/${t.user_id}`}><b>{t.lead_name || t.lead_email}</b></Link><div className="small muted">{t.lead_phone?.trim() || t.lead_email}</div></td>
                )}
                <td><span className="pill">{TASK_KIND_LABEL[t.kind] ?? t.kind}</span><div className="small">{t.title}</div>{t.note && <div className="small muted">{t.note}</div>}
                  {t.meet_url && t.status === 'open' && <a className="btn btn-soft btn-sm crm-join" href={t.meet_url} target="_blank" rel="noopener noreferrer">Join Google Meet</a>}</td>
                <td className={late ? 'crm-late' : undefined}>{fmtDate(t.due_at)}<div className="small muted">{relative(t.due_at)}</div></td>
                {showOwner && <td><Person s={t.owner_id ? people.get(t.owner_id) : null} /></td>}
                <td>
                  {t.missed && <span className="pill danger">Missed</span>}{' '}
                  {t.status === 'done' ? <span className="small">{outcomeLabel(t.outcome)}{t.completed_at && <span className="muted"> · {fmtDate(t.completed_at)}</span>}</span>
                    : t.outcome ? <span className="small muted">Last try: {outcomeLabel(t.outcome)}</span> : !t.missed && <span className="pill warning">Open</span>}
                  {t.outcome_note && <div className="small muted">“{t.outcome_note}”</div>}
                </td>
                {canAct && <td>{t.status === 'open' && <CompleteTask leadId={t.user_id} taskId={t.id} isCall={t.kind !== 'reminder'} />}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
