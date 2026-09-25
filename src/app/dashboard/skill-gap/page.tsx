import { ToolPage } from '@/components/tools/ToolPage'
import { getTool } from '@/lib/tools-meta'

export const metadata = { title: getTool('skill-gap')!.name }
export const maxDuration = 60

export default function Page() {
  return <ToolPage id="skill-gap" />
}
