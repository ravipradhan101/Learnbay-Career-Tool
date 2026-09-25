import { ResumeReview } from '@/components/dashboard/ResumeReview'
import { getReadyDashboard, getResumeAnalysis } from '@/lib/data'

export const metadata = { title: 'Resume Feedback' }

export default async function ResumePage() {
  const { user, report } = await getReadyDashboard()
  const existing = await getResumeAnalysis(user.id)
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your Resume Analysis <span className="pill" style={{ verticalAlign: 'middle' }}>Optional</span></h1>
          <p>Upload your resume and we&apos;ll show how ready it is for {/^[aeiou]/i.test(report.data.recommendedPath.title) ? 'an' : 'a'} {report.data.recommendedPath.title} role.</p>
        </div>
      </div>
      <ResumeReview initial={existing ? { analysis: existing.data, fileName: existing.file_name } : null} />
    </>
  )
}
