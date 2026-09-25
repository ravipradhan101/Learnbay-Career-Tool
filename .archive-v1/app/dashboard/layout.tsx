import type { Metadata } from 'next'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { DashboardNudges } from '@/components/dashboard/DashboardNudges'
import { PendingReport } from '@/components/dashboard/PendingReport'
import { getDashboardData, getLatestCounsellorRequest } from '@/lib/data'
import { firstName } from '@/lib/validation'

export const metadata: Metadata = { title: 'My Dashboard', robots: { index: false, follow: false } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const data = await getDashboardData()
  const pathname = (await headers()).get('x-pathname') ?? ''

  if ('notReady' in data && pathname !== '/dashboard/counselor') {
    return <PendingReport name={firstName(data.user.name)} />
  }

  const counsellor = await getLatestCounsellorRequest(data.user.id)
  return (
    <DashboardShell email={data.user.email}>
      {children}
      <Suspense fallback={null}>
        <DashboardNudges hasCounsellorRequest={Boolean(counsellor)} />
      </Suspense>
    </DashboardShell>
  )
}
