/**
 * Central API client for RansomShield frontend.
 *
 * Design decisions:
 * - Access token lives in a module-level variable (in-memory only, never localStorage).
 * - Every request includes credentials: 'include' so the httpOnly refresh cookie is sent.
 * - On a 401, the client automatically calls POST /auth/refresh-token (cookie-based),
 *   stores the new access token, and retries the original request exactly once.
 * - If refresh itself fails, the user is redirected to /login (i.e. the React app
 *   resets to the login screen via the onAuthFailure callback).
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api'

// ─── In-memory token store ────────────────────────────────────────────────────

let _accessToken: string | null = null
let _onAuthFailure: (() => void) | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

/**
 * Register a callback that is called when both the original request and
 * the automatic token refresh both return 401 (i.e. session is truly expired).
 * App.tsx registers this to reset auth state and navigate to login.
 */
export function registerAuthFailureHandler(fn: () => void) {
  _onAuthFailure = fn
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

/**
 * apiFetch wraps the native fetch with:
 * - Prepended API base URL
 * - Authorization header injection
 * - credentials: 'include' for httpOnly cookie
 * - Automatic token refresh on 401 + single retry
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = buildHeaders(init.headers)
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status !== 401) {
    return response
  }

  // ── 401: attempt refresh ──────────────────────────────────────────────────
  const refreshed = await tryRefresh()
  if (!refreshed) {
    _onAuthFailure?.()
    return response // return the original 401 to the caller
  }

  // Retry with new token
  const retryHeaders = buildHeaders(init.headers)
  const retryResponse = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: retryHeaders,
    credentials: 'include',
  })

  if (retryResponse.status === 401) {
    _onAuthFailure?.()
  }

  return retryResponse
}

function buildHeaders(existing?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(existing as Record<string, string> | undefined),
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }
  return headers
}

/**
 * Calls POST /auth/refresh-token (relies on httpOnly cookie).
 * Updates the in-memory token on success.
 * Returns true if the refresh succeeded, false otherwise.
 */
let _refreshPromise: Promise<boolean> | null = null
async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) return false
      const data = await res.json()
      if (data.accessToken) {
        setAccessToken(data.accessToken)
        // Re-connect socket with new token
        _onTokenRefreshed?.(data.accessToken)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

/**
 * Attempts to restore the session on initial app load.
 * Returns the user object if successful, null otherwise.
 */
export async function restoreSession(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.accessToken && data.user) {
      setAccessToken(data.accessToken)
      return data.user
    }
    return null
  } catch {
    return null
  }
}

// ─── Token-refresh socket reconnect hook ─────────────────────────────────────

let _onTokenRefreshed: ((token: string) => void) | null = null
export function registerTokenRefreshHandler(fn: (token: string) => void) {
  _onTokenRefreshed = fn
}

// ─── Typed convenience wrappers ───────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'GET' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.message ?? res.statusText, res.status)
  }
  return res.json()
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.message ?? res.statusText, res.status)
  }
  return res.json()
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.message ?? res.statusText, res.status)
  }
  return res.json()
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.message ?? res.statusText, res.status)
  }
  return res.json()
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
