import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'
import { getCurrentAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = { title: 'Admin login', robots: { index: false, follow: false } }

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect('/admin')
  return (
    <main className="admin-shell" style={{ display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <div className="stack" style={{ alignItems: 'center', width: '100%' }}>
        <Logo href="/admin/login" />
        <AdminLoginForm />
      </div>
    </main>
  )
}
