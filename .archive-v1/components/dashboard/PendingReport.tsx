'use client'

import { Logo } from '../Logo'
import { GeneratingView } from '../GeneratingView'

/** Shown by the dashboard layout when the report has not been generated yet (e.g. after a refresh mid-generation). */
export function PendingReport({ name }: { name: string }) {
  return (
    <>
      <header className="site-header">
        <div className="container"><Logo /></div>
      </header>
      <main className="wizard-page">
        <div className="container">
          <div className="wizard-card">
            <GeneratingView name={name} onReady={() => window.location.replace('/dashboard?welcome=1')} />
          </div>
        </div>
      </main>
    </>
  )
}
