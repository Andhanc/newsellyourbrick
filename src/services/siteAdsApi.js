import { getApiBaseUrlSync } from '../utils/apiConfig'
import { getMarketerToken, setMarketerToken } from './newsApi'

const BASE = () => `${getApiBaseUrlSync()}/news`

function marketerHeaders() {
  const token = getMarketerToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function handleAuthError(res) {
  if (res.status === 401) {
    setMarketerToken('')
    throw new Error('SESSION_EXPIRED')
  }
}

export async function fetchActiveSiteAds() {
  const res = await fetch(`${BASE()}/ads`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Не удалось загрузить рекламу')
  return data.ads || []
}

export async function fetchMarketerSiteAds() {
  const res = await fetch(`${BASE()}/marketer/ads`, { headers: marketerHeaders() })
  const data = await res.json().catch(() => ({}))
  handleAuthError(res)
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
  return data.ads || []
}

export async function createMarketerSiteAd(payload) {
  const res = await fetch(`${BASE()}/marketer/ads`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  handleAuthError(res)
  if (!res.ok) throw new Error(data.error || 'Ошибка создания')
  return data.ad
}

export async function deleteMarketerSiteAd(id) {
  const res = await fetch(`${BASE()}/marketer/ads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: marketerHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  handleAuthError(res)
  if (!res.ok) throw new Error(data.error || 'Ошибка удаления')
  return true
}
