import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { Logo } from './Logo'
import { Icon } from './Icon'

/** Public header. Mentor booking lives inside the studio, after we have contact details. */
export async function SiteHeader({ showAuth = true }: { showAuth?: boolean }) {
  const user = await getCurrentUser()
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <div className="header-actions">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">My Studio <Icon name="arrowRight" size="1rem" /></Link>
          ) : showAuth ? (
            <>
              <Link href="/login" className="btn btn-ghost">Login</Link>
              <Link href="/start" className="btn btn-primary">
                <span className="cta-long">Start My Free Analysis</span>
                <span className="cta-short">Start free</span>
                <Icon name="arrowRight" size="1rem" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
