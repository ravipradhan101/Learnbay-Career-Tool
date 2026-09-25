'use client'

import { useEffect } from 'react'
import { Icon } from './Icon'

/** Opens the browser's print dialog, where learners choose "Save as PDF". */
export function PrintButton() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <button type="button" className="btn btn-primary btn-sm no-print" onClick={() => window.print()}>
      <Icon name="download" size="1rem" /> Save as PDF
    </button>
  )
}
