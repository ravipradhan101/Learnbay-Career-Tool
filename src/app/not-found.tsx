import Link from 'next/link'
import { Robot } from '@/components/Robot'

export default function NotFound() {
  return (
    <main className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
        <Robot className="welcome-robot" />
        <h1>Page not found</h1>
        <p className="muted">This page doesn&apos;t exist or the link has expired.</p>
        <Link href="/" className="btn btn-primary">Go to home</Link>
      </div>
    </main>
  )
}
