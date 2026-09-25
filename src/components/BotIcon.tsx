/** A friendly robot head for the Career AI launcher (inherits currentColor). */
export function BotIcon({ size = '1.75rem' }: { size?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <line x1="16" y1="3.5" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="3.5" r="2" fill="currentColor" />
      <rect x="5" y="8" width="22" height="17" rx="6" fill="currentColor" />
      <rect x="8.5" y="12" width="15" height="8.5" rx="4.25" fill="#1e3a8a" />
      <circle cx="13" cy="16.25" r="1.8" fill="#5eead4" />
      <circle cx="19" cy="16.25" r="1.8" fill="#5eead4" />
      <rect x="2" y="13" width="3" height="7" rx="1.5" fill="currentColor" />
      <rect x="27" y="13" width="3" height="7" rx="1.5" fill="currentColor" />
      <path d="M12 25h8l-4 4z" fill="currentColor" />
    </svg>
  )
}
