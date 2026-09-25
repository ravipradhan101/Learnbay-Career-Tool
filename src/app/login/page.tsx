import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { LoginForm } from '@/components/LoginForm'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Login', robots: { index: false } }

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : ''
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
