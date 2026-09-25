import { env } from './env'
import { hmac, safeEqualHex } from './security'

// Links in emails carry a short signed tag naming the learner they were sent to (`?for=`).
// If a different account is signed in on that browser, the studio asks the person to switch
// instead of showing — or building — a report for the wrong account.

export function linkSig(userId: string): string {
  return hmac(`link:${userId}`).slice(0, 16)
}

export function linkMatches(userId: string, sig: string | null | undefined): boolean {
  return !sig || (/^[0-9a-f]{16}$/.test(sig) && safeEqualHex(sig, linkSig(userId)))
}

/** Absolute link to a studio page for one learner (used in every learner email). */
export function learnerUrl(userId: string, path: string, params: Record<string, string> = {}): string {
  const url = new URL(path, env.appUrl)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('for', linkSig(userId))
  return url.toString()
}
