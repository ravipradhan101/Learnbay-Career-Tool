// Browser-side product analytics: page views, time on page, clicks, onboarding and tool steps.
// Events are queued and sent in small batches so thousands of visitors don't mean thousands of requests.
// Nothing typed into forms is ever recorded, only which step or option was chosen.

export type AnalyticsType = 'page_view' | 'page_leave' | 'click' | 'step_view' | 'step_answer' | 'step_back' | 'action' | 'error'
type Props = Record<string, string | number | boolean | undefined>
type QueuedEvent = { type: AnalyticsType; name?: string; path: string; props: Record<string, string | number | boolean>; ts: number }

const VISITOR_KEY = 'lcn_vid'
const SESSION_KEY = 'lcn_sid'
const SESSION_IDLE_MS = 30 * 60_000
const FLUSH_MS = 5_000
const MAX_BATCH = 25

let queue: QueuedEvent[] = []
let timer: number | null = null
let memoryVisitor: string | null = null
let memorySession: { id: string; last: number } | null = null

function uuid(): string {
  try { return crypto.randomUUID() } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}` }
}

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) { id = uuid(); localStorage.setItem(VISITOR_KEY, id) }
    return id
  } catch {
    return (memoryVisitor ??= uuid())
  }
}

/** A visit ends after 30 idle minutes, like most analytics tools. */
function sessionId(): string {
  const now = Date.now()
  let s: { id: string; last: number } | null = null
  try { s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { s = memorySession }
  if (!s || typeof s.id !== 'string' || now - s.last > SESSION_IDLE_MS) s = { id: uuid(), last: now }
  s.last = now
  memorySession = s
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  return s.id
}

export function currentPath(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname
}

function tracked(path: string): boolean {
  return !path.startsWith('/admin')
}

export function track(type: AnalyticsType, name?: string, props: Props = {}, path = currentPath()) {
  if (typeof window === 'undefined') return
  if (!tracked(path)) return
  const clean: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== '') clean[k] = typeof v === 'string' ? v.slice(0, 120) : v
  queue.push({ type, name: name?.slice(0, 80), path, props: clean, ts: Date.now() })
  if (queue.length >= MAX_BATCH) flush()
  else if (timer === null) timer = window.setTimeout(flush, FLUSH_MS)
}

export function flush() {
  if (timer !== null) { window.clearTimeout(timer); timer = null }
  if (!queue.length) return
  const events = queue.splice(0, MAX_BATCH)
  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: visitorId(), s: sessionId(), events }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore
  }
  if (queue.length) timer = window.setTimeout(flush, 250)
}

export function deviceType(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}
