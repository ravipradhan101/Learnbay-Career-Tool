import { track } from './analytics'

// Fire-and-forget engagement events (browser). They feed lead scoring and the admin flow reports.
export function trackEvent(type: string, detail: Record<string, string> = {}) {
  track('action', type, detail)
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, detail }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore
  }
}

export const OPEN_ASSISTANT_EVENT = 'lcn:open-assistant'

/** Opens the floating assistant from anywhere, optionally sending a first question. */
export function openAssistant(question?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: { question } }))
}
