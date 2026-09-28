import { ReportSheet } from '@/components/chat/ReportSheet'
import { getTool } from '@/lib/tools-meta'

export const metadata = { title: `${getTool('roadmap')!.name}: full report` }

export default function Page() {
  return <ReportSheet id="roadmap" />
}
