'use client'

import { useState } from 'react'
import { Icon } from '../Icon'
import { trackEvent } from '@/lib/track'

export function MasterclassInterest({ interest }: { interest: string }) {
  const [done, setDone] = useState(false)
  return (
    <section className="nextstep" style={{ marginLeft: 0 }}>
      <div>
        <span className="pill-accent">Live masterclasses</span>
        <div className="nextstep-title">
          <span className="fc-icon"><Icon name="play" size="1.4rem" /></span>
          <div>
            <h2>Learn live from industry mentors</h2>
            <p className="small muted">Get notified about the next Learnbay masterclass on {interest}.</p>
          </div>
        </div>
        <div className="nextstep-actions">
          {done
            ? <p className="form-success" role="status">You&apos;re on the list. We&apos;ll reach out when the next masterclass is scheduled.</p>
            : <button type="button" className="btn btn-primary" onClick={() => { trackEvent('masterclass_interest', { topic: interest }); setDone(true) }}>Notify me <Icon name="bell" size="1rem" /></button>}
        </div>
      </div>
    </section>
  )
}
