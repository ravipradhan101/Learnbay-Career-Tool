import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Learnbay Career Studio — your career, with a clear next step', template: '%s | Learnbay Career Studio' },
  description:
    'Answer 4 quick questions and get your skill gap analysis, salary benchmark and career roadmap — with an AI advisor and free mentor sessions. By Learnbay.',
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
  themeColor: '#2563eb',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers renders every page per request, which the CSP nonce needs.
  await headers()
  return (
    <html lang="en" className={inter.className}>
      <body>{children}<AnalyticsTracker /></body>
    </html>
  )
}
