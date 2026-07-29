import { getApiBaseUrlSync } from './apiConfig'

/**
 * Страна посетителя по IP (сервер читает CF / Vercel / прокси-заголовки).
 * @returns {Promise<string | null>} ISO 3166-1 alpha-2 или null
 */
export async function fetchVisitorCountryCode() {
  try {
    const base = getApiBaseUrlSync().replace(/\/$/, '')
    const res = await fetch(`${base}/geo/country`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => ({}))
    const raw = json?.country ?? json?.data?.country
    if (!raw) return null
    const code = String(raw).trim().toUpperCase()
    return /^[A-Z]{2}$/.test(code) ? code : null
  } catch {
    return null
  }
}
