import Link from 'next/link'

/**
 * The Learnbay wordmark, with "Career Studio" as a sub-brand beside it.
 * The mark ships as a raster lockup, so it is sized by height and the width
 * follows — never the other way round.
 */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Learnbay Career Studio home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-lockup" src="/brand/learnbay-logo.png" alt="Learnbay" width={800} height={164} />
      <span className="logo-sub">Career Studio</span>
    </Link>
  )
}
