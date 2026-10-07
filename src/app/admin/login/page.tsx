import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'
import { getCurrentStaff, landingFor, safeAdminNext } from '@/lib/admin-auth'

export const metadata: Metadata = { title: 'Admin login', robots: { index: false, follow: false } }

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next
  const next = safeAdminNext(Array.isArray(raw) ? raw[0] : raw)
  const staff = await getCurrentStaff()
  if (staff) redirect(landingFor(staff.role, next))
  return (
    <main className="admin-shell" style={{ display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <div className="stack" style={{ alignItems: 'center', width: '100%' }}>
        <Logo href="/admin/login" />
        <AdminLoginForm next={next} />
      </div>
    </main>
  )
}
