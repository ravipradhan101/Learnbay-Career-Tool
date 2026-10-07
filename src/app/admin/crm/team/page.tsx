import { fmtDate } from '@/components/admin/parts'
import { Person } from '@/components/crm/parts'
import { AddStaff, EditStaff, type Member } from '@/components/crm/TeamManager'
import { MyProfile } from '@/components/crm/MyProfile'
import { requireStaff } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { staffAudit } from '@/lib/crm/data'
import { canManage, staffDirectory, visibleIds, type StaffRow } from '@/lib/crm/scope'
import { ROLE_LABEL } from '@/lib/crm/roles'

export const metadata = { title: 'Team' }

export default async function TeamPage() {
  const me = await requireStaff()
  const dir = await staffDirectory()
  const visible = visibleIds(me, dir)
  const people = dir.filter((s) => visible.has(s.id))
  const counts = new Map((await query<{ owner_id: string; n: number }>(
    `SELECT owner_id, count(*)::int AS n FROM lead_owners WHERE owner_id = ANY($1::uuid[]) GROUP BY 1`, [people.map((p) => p.id)],
  )).map((r) => [r.owner_id, r.n]))
  const audit = me.role === 'admin' ? await staffAudit(40) : []
  const mine = (await query<{ name: string | null; phone: string | null; meet_url: string | null }>(`SELECT name, phone, meet_url FROM admin_users WHERE id = $1`, [me.id]))[0]
  const members: Member[] = people.map((p) => ({ id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, team: p.team, manager_id: p.manager_id, associate_id: p.associate_id, active: p.active, in_rotation: p.in_rotation }))
  const rotation = dir.filter((s) => s.role === 'ism' && s.active && s.in_rotation).length

  const Row = ({ s, depth }: { s: StaffRow; depth: number }) => (
    <li className={`crm-tree-row${s.active ? '' : ' inactive'}`} style={{ ['--depth' as string]: depth }}>
      <div className="crm-tree-who">
        <Person s={s} />
        {s.role === 'admin' && <span className="pill" title="Cannot be changed or deleted by anyone">🔒 Protected</span>}
        {s.role === 'manager' && s.team && <span className="pill primary">{s.team}</span>}
        {s.role === 'ism' && s.active && <span className={`pill ${s.in_rotation ? 'success' : 'warning'}`}>{s.in_rotation ? 'In round robin' : 'Round robin paused'}</span>}
        {!s.has_password && s.active && <span className="pill">Invited, no password yet</span>}
      </div>
      <div className="crm-tree-meta small muted">
        <span>{counts.get(s.id) ?? 0} lead{(counts.get(s.id) ?? 0) === 1 ? '' : 's'}</span>
        <span>Last sign-in {fmtDate(s.last_login_at)}</span>
        {canManage(me, s, dir) && <EditStaff me={{ id: me.id, role: me.role }} member={members.find((m) => m.id === s.id)!} people={members} />}
      </div>
    </li>
  )
  const ismsUnder = (pred: (s: StaffRow) => boolean, depth: number) => people.filter((s) => s.role === 'ism' && pred(s)).map((s) => <Row key={s.id} s={s} depth={depth} />)
  const associateBlock = (a: StaffRow, depth: number) => [<Row key={a.id} s={a} depth={depth} />, ...ismsUnder((s) => s.associate_id === a.id, depth + 1)]

  const managers = people.filter((s) => s.role === 'manager')
  const independents = people.filter((s) => s.role === 'associate' && !s.manager_id)
  const placed = new Set<string>()
  for (const m of managers) {
    placed.add(m.id)
    for (const s of people) if ((s.role === 'associate' && s.manager_id === m.id) || (s.role === 'ism' && s.manager_id === m.id)) placed.add(s.id)
  }
  for (const s of people) {
    if (s.role === 'admin' || (s.role === 'associate' && !s.manager_id)) placed.add(s.id)
    if (s.role === 'ism' && s.associate_id && people.some((a) => a.id === s.associate_id)) placed.add(s.id)
  }
  const loose = people.filter((s) => !placed.has(s.id))

  return (
    <>
      <div className="crm-page-head">
        <div>
          <h1>Team</h1>
          <p className="muted small">
            {me.role === 'admin' ? 'Everyone on the sales team. You manage all accounts except your own, which is protected.'
              : me.role === 'manager' ? 'Your team. You can add associates and ISMs and move them within your team; the admin changes roles and deactivates accounts.'
                : 'The people you work with.'}
            {' '}{rotation} ISM{rotation === 1 ? '' : 's'} in the round robin. ★ = independent associate.
          </p>
        </div>
        <AddStaff me={{ id: me.id, role: me.role }} people={members} />
      </div>

      <section className="card stack">
        <h2 className="card-title">My profile</h2>
        <MyProfile name={mine?.name ?? ''} phone={mine?.phone ?? ''} meetUrl={mine?.meet_url ?? ''} />
      </section>

      <section className="card">
        <ul className="crm-tree">
          {people.filter((s) => s.role === 'admin').map((s) => <Row key={s.id} s={s} depth={0} />)}
          {managers.map((m) => [
            <Row key={m.id} s={m} depth={0} />,
            ...people.filter((s) => s.role === 'associate' && s.manager_id === m.id).flatMap((a) => associateBlock(a, 1)),
            ...ismsUnder((s) => s.manager_id === m.id, 1),
          ])}
          {independents.flatMap((a) => associateBlock(a, 0))}
          {loose.map((s) => <Row key={s.id} s={s} depth={0} />)}
        </ul>
      </section>

      {audit.length > 0 && (
        <section className="card stack">
          <h2 className="card-title">Access changes</h2>
          <p className="help-note">Every account created, moved, paused or deactivated, and by whom.</p>
          <div className="table-scroll">
            <table className="admin-table compact">
              <thead><tr><th>When</th><th>By</th><th>Account</th><th>Change</th></tr></thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td className="small">{fmtDate(a.created_at)}</td><td>{a.actor}</td><td>{a.target}</td>
                    <td className="small">{a.action === 'created' ? `Added as ${ROLE_LABEL[a.detail.role as keyof typeof ROLE_LABEL] ?? a.detail.role}` : a.action === 'leads_moved' ? `Moved ${String(a.detail.count)} leads` : Object.keys(a.detail).map((k) => `${k.replace(/_id$/, '').replace(/_/g, ' ')}: ${String(a.detail[k] ?? 'none')}`).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
