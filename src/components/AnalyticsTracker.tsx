'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { deviceType, flush, track } from '@/lib/analytics'

const FIRST_VISIT_KEY = 'lcn_first_src'

/** Where this visit came from: UTM tags and the referring site (hostname only). Sent with the first page view of a visit. */
function sourceProps(): Record<string, string> {
  const out: Record<string, string> = {}
  const params = new URLSearchParams(window.location.search)
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const v = params.get(key)
    if (v) out[key] = v.slice(0, 80)
  }
  try {
    const ref = document.referrer ? new URL(document.referrer).hostname : ''
    if (ref && ref !== window.location.hostname) out.referrer = ref
  } catch { /* ignore */ }
  return out
}

/** Short, non-personal label for a clicked element. Anything under [data-track-ignore] is skipped. */
function clickLabel(el: HTMLElement): string {
  const explicit = el.getAttribute('data-track') || el.getAttribute('aria-label') || el.getAttribute('title')
  // innerText keeps the line breaks between a button's title and hint, so they don't run together.
  const text = explicit || el.innerText || el.textContent || ''
  return text.split(/\n+/)[0].replace(/\s+/g, ' ').trim().slice(0, 60)
}

/**
 * Mounted once in the root layout. Records page views (with the previous page, so paths can be rebuilt),
 * visible time and scroll depth when a page is left, and clicks on links and buttons.
 */
export function AnalyticsTracker() {
  const pathname = usePathname()
  const page = useRef<{ path: string; visibleMs: number; since: number | null; maxScroll: number } | null>(null)
  const sentSource = useRef(false)

  // Page view on every route change; page_leave for the page before it.
  useEffect(() => {
    if (!pathname) return
    const prev = page.current
    if (prev?.path === pathname) return
    if (prev) leave(prev, false)
    let extra: Record<string, string> = {}
    if (!sentSource.current) {
      sentSource.current = true
      try {
        if (!sessionStorage.getItem(FIRST_VISIT_KEY)) { sessionStorage.setItem(FIRST_VISIT_KEY, '1'); extra = { entry: '1', ...sourceProps() } }
      } catch { extra = sourceProps() }
    }
    track('page_view', pathname, { from: prev?.path, device: deviceType(), ...extra })
    page.current = { path: pathname, visibleMs: 0, since: document.visibilityState === 'visible' ? Date.now() : null, maxScroll: 0 }
  }, [pathname])

  useEffect(() => {
    const onScroll = () => {
      const p = page.current
      if (!p) return
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const pct = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100)
      if (pct > p.maxScroll) p.maxScroll = Math.min(100, pct)
    }
    const onVisibility = () => {
      const p = page.current
      if (!p) return
      if (document.visibilityState === 'hidden') {
        if (p.since !== null) { p.visibleMs += Date.now() - p.since; p.since = null }
        flush()
      } else {
        p.since = Date.now()
      }
    }
    const onPageHide = () => { if (page.current) leave(page.current, true); flush() }
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>('a, button, [role="button"], [data-track]')
      if (!el || el.closest('[data-track-ignore]')) return
      const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') ?? '' : ''
      let dest = ''
      if (href) {
        try {
          const u = new URL(href, window.location.href)
          dest = u.origin === window.location.origin ? u.pathname : u.hostname
        } catch { /* ignore */ }
      }
      track('click', clickLabel(el) || el.tagName.toLowerCase(), { href: dest || undefined })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('click', onClick, { capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('click', onClick, { capture: true })
    }
  }, [])

  return null
}

function leave(p: { path: string; visibleMs: number; since: number | null; maxScroll: number }, exit: boolean) {
  const visible = p.visibleMs + (p.since !== null ? Date.now() - p.since : 0)
  p.visibleMs = 0
  p.since = null
  // page_leave is recorded against the page being left, not the new URL.
  track('page_leave', p.path, { duration_ms: Math.min(visible, 3_600_000), scroll_pct: p.maxScroll, exit: exit || undefined }, p.path)
}
