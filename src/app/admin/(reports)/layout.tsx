import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Logo } from '@/components/Logo'
import { AdminNav } from '@/components/admin/AdminNav'
import { AdminLogout } from '@/components/admin/AdminLogout'
import { requireAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = { title: { default: 'Admin reports', template: '%s | Admin reports' }, robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="container">
          <div className="admin-top-inner">
            <div className="row" style={{ flexWrap: 'nowrap' }}><Logo href="/admin" /><span className="pill primary">Admin</span></div>
            <div className="row" style={{ flexWrap: 'nowrap' }}><span className="small muted desktop-only">{admin.email}</span><AdminLogout /></div>
          </div>
          <Suspense><AdminNav /></Suspense>
        </div>
      </header>
      <main className="container admin-main">{children}</main>
    </div>
  )
}
