import Link from 'next/link'

/** The official Learnbay logo (from learnbay.co), with a quiet product label. */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Learnbay Career Studio home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/learnbay-logo.png" alt="Learnbay" width={114} height={26} className="logo-img" />
      <span className="logo-product">Career Studio</span>
    </Link>
  )
}
