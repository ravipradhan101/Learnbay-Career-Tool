import { CallButton } from './CallButton'
import { EngagementPopup } from './EngagementPopup'
import { FloatingAssistant } from './FloatingAssistant'
import { env } from '@/lib/env'

/** Floating assistant, mobile call button and exit-intent popup, shared by every page. */
export function SiteWidgets({ signedIn, hasSession, program }: { signedIn: boolean; hasSession: boolean; program: { name: string; url: string } }) {
  return (
    <>
      <FloatingAssistant signedIn={signedIn} />
      <CallButton signedIn={signedIn} voiceUrl={env.voiceAssistantUrl} voicePhone={env.voiceAssistantPhone} />
      <EngagementPopup signedIn={signedIn} hasSession={hasSession} program={program} />
    </>
  )
}
