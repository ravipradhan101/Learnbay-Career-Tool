/** Certification and ecosystem partners (logos supplied by Learnbay and used with permission). */
export const PARTNER_LOGOS = [
  { src: '/partners/ibm.png', alt: 'IBM', w: 65 },
  { src: '/partners/microsoft.png', alt: 'Microsoft', w: 125 },
  { src: '/partners/iit-patna.png', alt: 'IIT Patna (Vishlesan I-Hub)', w: 84 },
  { src: '/partners/nasscom.png', alt: 'Nasscom', w: 144 },
  { src: '/partners/woolf.png', alt: 'Woolf', w: 112 },
]

export function PartnerLogos({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <ul className={`partner-logos ${className}`} aria-label="Certifications and partners">
      {PARTNER_LOGOS.map((p) => (
        <li key={p.alt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={p.alt} height={size} width={Math.round((p.w / 25) * size)} loading="lazy" />
        </li>
      ))}
    </ul>
  )
}
