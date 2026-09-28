/** The four-point AI sparkle used for the advisor. */
export function Sparkle({ size = '1.5rem' }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sp-g" x1="0" y1="0" x2="1" y2="1">
          {/* The brand gradient, so every AI surface tells one colour story. */}
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M12 1.5c.7 5.2 3.3 7.8 8.5 8.5v.1c-5.2.7-7.8 3.3-8.5 8.5h-.1c-.7-5.2-3.3-7.8-8.5-8.5V10c5.2-.7 7.8-3.3 8.5-8.5z" fill="url(#sp-g)" />
      <path d="M19 15.5c.3 2 1.3 3 3.3 3.3-2 .3-3 1.3-3.3 3.3-.3-2-1.3-3-3.3-3.3 2-.3 3-1.3 3.3-3.3z" fill="#7c3aed" opacity="0.85" />
    </svg>
  )
}
