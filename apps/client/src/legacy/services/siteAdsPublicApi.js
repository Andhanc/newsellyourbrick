import { getApiBaseUrlSync } from '../utils/apiConfig'

/** Публичный список рекламы — без newsApi / marketer token. */
export async function fetchActiveSiteAds() {
  const base = `${getApiBaseUrlSync()}/news`
  const res = await fetch(`${base}/ads`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Не удалось загрузить рекламу')
  return data.ads || []
}
