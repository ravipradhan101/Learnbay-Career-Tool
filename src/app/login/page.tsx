import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { LoginForm } from '@/components/LoginForm'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Login', robots: { index: false } }

/** Only our own learner pages (no other site, and no tricks like "/%09/evil.com" that browsers turn into "//evil.com"). */
function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value
  return typeof next === 'string' && /^\/(dashboard|start|r)(\/[A-Za-z0-9\-/]*)?(\?[A-Za-z0-9=&%._-]*)?$/.test(next) ? next : ''
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const next = safeNext(params.next)
  if (await getCurrentUser()) redirect(next || '/dashboard')
  return (
    <>
      <SiteHeader showAuth={false} />
      <main className="auth-wrap">
        <LoginForm next={next} />
      </main>
    </>
  )
}
