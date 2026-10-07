import type { Metadata } from 'next'
import { Logo } from '@/components/Logo'
import { AdminLogout } from '@/components/admin/AdminLogout'
import { CrmNav } from '@/components/crm/CrmNav'
import { requireStaff } from '@/lib/admin-auth'
import { ROLE_LABEL } from '@/lib/crm/roles'
import './crm.css'

export const metadata: Metadata = { title: { default: 'Pseudo Sales CRM', template: '%s | Pseudo Sales CRM' }, robots: { index: false, follow: false } }

/** The sales team side ("Pseudo Sales CRM": it feeds the main Sales CRM through webhooks and the API). Separate from the learner app and from the admin reports; every page checks access itself. */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff()
  return (
    <div className="admin-shell crm-shell">
      <header className="admin-top">
        <div className="container">
          <div className="admin-top-inner">
            <div className="row" style={{ flexWrap: 'nowrap' }}><Logo href="/admin/crm" /><span className="crm-brand-pill" title="A staging CRM. It syncs to the main Sales CRM through webhooks and the API.">Pseudo Sales CRM</span></div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="small muted desktop-only">{me.name ?? me.email}</span>
              <span className={`crm-role crm-role-${me.role}`}>{ROLE_LABEL[me.role]}</span>
              <AdminLogout />
            </div>
          </div>
          <CrmNav isAdmin={me.role === 'admin'} />
        </div>
      </header>
      <main className="container admin-main">{children}</main>
    </div>
  )
}
