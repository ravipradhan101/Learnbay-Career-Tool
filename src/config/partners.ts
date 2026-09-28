// Certification and partner marks shown in the hero.
//
// These are third-party trademarks, supplied by Learnbay as its own
// certifications and partnerships. Showing a mark here asserts that
// relationship publicly, so only add one Learnbay actually holds.
//
// Logos live in /public/partners and are all ~49px tall, so the row sizes them
// by height and lets the width follow.

export type Partner = { name: string; logo: string }

export const PARTNERS: Partner[] = [
  { name: 'IBM', logo: '/partners/ibm.png' },
  { name: 'Microsoft', logo: '/partners/microsoft.png' },
  { name: 'Vishleshan i-HUB Foundation, IIT Patna', logo: '/partners/iit-patna.png' },
  { name: 'Woolf', logo: '/partners/woolf.png' },
  { name: 'nasscom', logo: '/partners/nasscom.png' },
]
