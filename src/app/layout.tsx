import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { headers } from 'next/headers'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'
import './globals.css'
import './chat.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
// The chat uses Plus Jakarta Sans (self-hosted by Next at build time, so no external font requests).
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-jakarta' })

export const metadata: Metadata = {
  title: { default: 'Learnbay Career Studio — your career, with a clear next step', template: '%s | Learnbay Career Studio' },
  description:
    'Pick your track and talk to a Learnbay career counsellor: readiness score, skill gaps, salary benchmark and a personal roadmap for AI, FDE and Cloud & DevOps roles. Free.',
  applicationName: 'Learnbay Career Studio',
  openGraph: {
    title: 'Learnbay Career Studio',
    description: 'Personalized roadmap, skill gap analysis, salary insights and the best learning path for your goals — powered by AI.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4338ca',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers renders every page per request, which the CSP nonce needs.
  await headers()
  return (
    // Browser extensions (Grammarly, password managers…) add attributes to <html> and <body> before React loads;
    // suppressHydrationWarning ignores those (it applies to these two tags only, not the app inside them).
    <html lang="en" className={`${inter.className} ${jakarta.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}<AnalyticsTracker /></body>
    </html>
  )
}
