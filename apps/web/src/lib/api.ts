const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || '/api'

let _accessToken: string | null = null
let _onAuthFailure: (() => void) | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function registerAuthFailureHandler(fn: () => void) {
  _onAuthFailure = fn
}

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

  const refreshed = await tryRefresh()
  if (!refreshed) {
    _onAuthFailure?.()
    return response
  }

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

let _refreshPromise: Promise<boolean> | null = null
async function tryRefresh(): Promise<boolean> {
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

let _onTokenRefreshed: ((token: string) => void) | null = null
export function registerTokenRefreshHandler(fn: (token: string) => void) {
  _onTokenRefreshed = fn
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'GET' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.error ?? err.message ?? res.statusText, res.status)
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
    throw new ApiError(err.error ?? err.message ?? res.statusText, res.status)
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
    throw new ApiError(err.error ?? err.message ?? res.statusText, res.status)
  }
  return res.json()
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(err.error ?? err.message ?? res.statusText, res.status)
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
