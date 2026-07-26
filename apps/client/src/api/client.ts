import { Platform } from 'react-native'
import Constants from 'expo-constants'

type Extra = {
  apiBaseUrl?: string
  mediaOrigin?: string
}

function readExtra(): Extra {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra
  return extra
}

/**
 * Absolute API base for Android; relative `/api` works on Expo Web when proxied.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL
  if (fromEnv && fromEnv.trim()) {
    let base = fromEnv.replace(/\/+$/, '')
    // Prefer localhost over 127.0.0.1 on web to avoid Private Network Access quirks.
    if (Platform.OS === 'web') {
      base = base.replace('://127.0.0.1', '://localhost')
    }
    return base
  }
  const extra = readExtra().apiBaseUrl
  if (extra && extra.trim()) return extra.replace(/\/+$/, '')
  if (Platform.OS === 'web') return '/api'
  // Android emulator → host machine
  return 'http://10.0.2.2:3000/api'
}

export function getMediaOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_MEDIA_ORIGIN
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/+$/, '')
  const extra = readExtra().mediaOrigin
  if (extra && extra.trim()) return extra.replace(/\/+$/, '')
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin
    }
    return ''
  }
  return 'http://10.0.2.2:3000'
}

export function resolveMediaUrl(pathOrUrl: string | null | undefined): string {
  const raw = String(pathOrUrl || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  // Already absolute path on same web origin
  if (Platform.OS === 'web' && raw.startsWith('/') && typeof window !== 'undefined') {
    // Prefer API/media origin when set, else current origin (Vite/Expo proxy later)
    const origin = getMediaOrigin() || window.location.origin
    return `${origin}${raw}`
  }
  const origin = getMediaOrigin()
  if (raw.startsWith('/')) return `${origin}${raw}`
  return `${origin}/${raw}`
}

export type ApiError = {
  status: number
  message: string
  body?: unknown
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string | null; timeoutMs?: number } = {},
): Promise<T> {
  const { token, timeoutMs = 45000, headers, ...rest } = options
  const base = getApiBaseUrl()
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(rest.body && !(rest.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err: ApiError = {
        status: res.status,
        message: (data as { error?: string })?.error || `HTTP ${res.status}`,
        body: data,
      }
      throw err
    }
    return data as T
  } finally {
    clearTimeout(timer)
  }
}
