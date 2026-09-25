import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { SwitchAccount } from '@/components/SwitchAccount'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Switch account', robots: { index: false, follow: false } }

/** Shown when an emailed link was meant for a different learner than the one signed in on this browser. */
export default async function SwitchAccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next
  const value = Array.isArray(raw) ? raw[0] : raw
  const next = value && /^\/dashboard(\/[a-z-]+)?$/.test(value) ? value : '/dashboard'
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`)
  const [local, domain] = user.email.split('@')
  const masked = `${local.slice(0, 2)}${'•'.repeat(Math.max(1, local.length - 2))}@${domain}`
  const first = (user.name ?? '').trim().split(/\s+/)[0] || 'this account'
  return (
    <main className="admin-shell" style={{ display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <div className="stack" style={{ alignItems: 'center', width: '100%' }}>
        <Logo />
        <SwitchAccount next={next} first={first} masked={masked} />
      </div>
    </main>
  )
}
