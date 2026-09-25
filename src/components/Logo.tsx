import Link from 'next/link'

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Learnbay Career Studio home">
      <svg viewBox="0 0 32 32" className="logo-mark" aria-hidden="true" focusable="false">
        <path d="M16 3c3 4 3.5 8 1.5 12.5C15 11 12 8 16 3z" fill="#f97316" />
        <path d="M5 11c5 0 8.5 2.5 10 8-4.5-.5-8.5-3-10-8z" fill="#2563eb" />
        <path d="M27 11c-5 0-8.5 2.5-10 8 4.5-.5 8.5-3 10-8z" fill="#7c3aed" />
        <path d="M16 18.5c-1.8 3-1.8 6.5 0 10.5 1.8-4 1.8-7.5 0-10.5z" fill="#0ea5e9" />
      </svg>
      <span className="logo-text"><b>Learnbay</b><small>CAREER STUDIO</small></span>
    </Link>
  )
}
