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

export async function postJson(url: string, body: unknown, method: 'POST' | 'DELETE' = 'POST'): Promise<ApiResult> {
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
