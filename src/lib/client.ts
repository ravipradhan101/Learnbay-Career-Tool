// Browser-side fetch helpers. Always same-origin JSON.

export type ApiResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string; status: number; data: Record<string, unknown> }

async function parse(res: Response): Promise<ApiResult> {
  let data: Record<string, unknown> = {}
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    // Non-JSON error page (for example a proxy timeout).
  }
  if (res.ok && data.ok !== false) return { ok: true, data }
  return { ok: false, status: res.status, data, error: typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.' }
}

export async function postJson(url: string, body: unknown, method: 'POST' | 'DELETE' | 'PATCH' = 'POST'): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      credentials: 'same-origin',
    })
    return parse(res)
  } catch {
    return { ok: false, status: 0, data: {}, error: 'Network error. Check your connection and try again.' }
  }
}

export async function getJson(url: string): Promise<ApiResult> {
  try {
    return parse(await fetch(url, { credentials: 'same-origin', cache: 'no-store' }))
  } catch {
    return { ok: false, status: 0, data: {}, error: 'Network error. Check your connection and try again.' }
  }
}

export async function postForm(url: string, form: FormData): Promise<ApiResult> {
  try {
    return parse(await fetch(url, { method: 'POST', body: form, credentials: 'same-origin' }))
  } catch {
    return { ok: false, status: 0, data: {}, error: 'Network error. Check your connection and try again.' }
  }
}

export function storageGet<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function storageSet(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode); progress simply isn't cached.
  }
}

export function storageRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ---------- Chat state: this tab only ----------
// Conversations are never cached across visits: a new visit always starts a fresh chat. sessionStorage keeps
// the current conversation through a refresh in the same tab and is cleared when the tab is closed.

export function sessionGet<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function sessionSet(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the conversation simply isn't kept through a refresh.
  }
}

export function sessionRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Forgets the conversation with Lumi kept in this tab (it only survives a refresh mid-way). Called when a new
 * journey starts, after sign-in hands the chat over to the counsellor, and on logout.
 * `keepHandover` keeps the copy the dashboard is about to pick up.
 */
export function clearGuestChat(keepHandover = false) {
  try {
    for (const k of Object.keys(window.sessionStorage)) {
      if (!k.startsWith('lcn_chat') || (keepHandover && (k === 'lcn_chat_adopt' || k === 'lcn_chat_pending_q'))) continue
      window.sessionStorage.removeItem(k)
    }
    if (!keepHandover) for (const k of Object.keys(window.sessionStorage)) if (k.startsWith('lcn_thread')) window.sessionStorage.removeItem(k)
  } catch {
    // ignore
  }
}

/** Removes chats cached in the browser by earlier versions (they used to reopen on every visit). */
export function clearCachedChats() {
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith('lcn_chat') || k.startsWith('lcn_thread') || k.startsWith('lcn_onboard')) window.localStorage.removeItem(k)
    }
  } catch {
    // ignore
  }
}
