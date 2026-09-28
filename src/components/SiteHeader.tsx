import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { Logo } from './Logo'
import { Icon } from './Icon'

/**
 * Public header. Mentor booking lives inside the studio, after we have contact
 * details.
 *
 * `showStart` drops the start button on pages that already carry the call to
 * action in their own content, so the page asks for one decision, not two.
 */
export async function SiteHeader({ showAuth = true, showStart = true }: { showAuth?: boolean; showStart?: boolean }) {
  const user = await getCurrentUser()
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <div className="header-actions">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">My Studio</Link>
          ) : showAuth ? (
            <>
              <Link href="/login" className={showStart ? 'btn btn-ghost' : 'btn btn-outline'}>Log in</Link>
              {showStart && (
                <Link href="/start" className="btn btn-primary">
                  <span className="cta-long">Start My Free Analysis</span>
                  <span className="cta-short">Start free</span>
                </Link>
              )}
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
