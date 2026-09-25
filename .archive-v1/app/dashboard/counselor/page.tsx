import { CounselorForm } from '@/components/dashboard/CounselorForm'
import { getDashboardData, getLatestCounsellorRequest } from '@/lib/data'
import { slotLabel } from '@/lib/counsellor'

export const metadata = { title: 'Talk to a Counselor' }

export default async function CounselorPage() {
  const { user } = await getDashboardData()
  const latest = await getLatestCounsellorRequest(user.id)
  const phone = user.phone ? `${user.phone_country ?? ''} ${user.phone}`.trim() : ''
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Talk to a Career Counselor</h1>
          <p>Get personalized guidance, clear answers on fees and batch timings, and the right Learnbay program for your goals.</p>
        </div>
      </div>
      <CounselorForm
        phone={phone}
        existing={latest ? { when: `${latest.preferred_date ?? 'Any day'}, ${slotLabel(latest.preferred_slot)}`, status: latest.status } : null}
      />
    </>
  )
}
