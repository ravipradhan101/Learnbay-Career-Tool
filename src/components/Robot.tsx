/** The Career Navigator mascot. Pure SVG so it scales with its container. */
export function Robot({ className, sparkles = true }: { className?: string; sparkles?: boolean }) {
  return (
    <svg viewBox="0 0 160 160" className={className} role="img" aria-label="AI Career Navigator assistant" focusable="false">
      <defs>
        <linearGradient id="rb-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6ebff" />
        </linearGradient>
        <linearGradient id="rb-visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>
        <radialGradient id="rb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c7d2fe" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c7d2fe" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="86" r="70" fill="url(#rb-glow)" />
      <line x1="80" y1="30" x2="80" y2="16" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="80" cy="13" r="6" fill="#6366f1" />
      <rect x="28" y="62" width="12" height="26" rx="6" fill="#6366f1" />
      <rect x="120" y="62" width="12" height="26" rx="6" fill="#6366f1" />
      <rect x="36" y="30" width="88" height="80" rx="30" fill="url(#rb-head)" stroke="#c7d2fe" strokeWidth="2" />
      <rect x="47" y="48" width="66" height="42" rx="18" fill="url(#rb-visor)" />
      <path d="M62 68q6-8 12 0" stroke="#5eead4" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M86 68q6-8 12 0" stroke="#5eead4" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M72 79q8 6 16 0" stroke="#5eead4" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M58 112h44a10 10 0 0 1 10 10v10H48v-10a10 10 0 0 1 10-10z" fill="url(#rb-head)" stroke="#c7d2fe" strokeWidth="2" />
      <circle cx="80" cy="124" r="5" fill="#6366f1" />
      {sparkles && (
        <g fill="#6366f1">
          <path d="M136 26l2.5 6.5L145 35l-6.5 2.5L136 44l-2.5-6.5L127 35l6.5-2.5z" />
          <path d="M20 40l1.6 4.4L26 46l-4.4 1.6L20 52l-1.6-4.4L14 46l4.4-1.6z" opacity="0.7" />
          <path d="M146 96l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z" opacity="0.6" />
        </g>
      )}
    </svg>
  )
}
