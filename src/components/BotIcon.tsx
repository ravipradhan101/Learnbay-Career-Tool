/** The Career AI face: two eyes, drawn in currentColor on the blue avatar disc.
 *  The eyes carry a class so the launcher can blink them. */
export function BotIcon({ size = '1.75rem' }: { size?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <rect className="bot-eye" x="10" y="9" width="4.5" height="14" rx="2.25" fill="currentColor" />
      <rect className="bot-eye" x="17.5" y="9" width="4.5" height="14" rx="2.25" fill="currentColor" />
    </svg>
  )
}
