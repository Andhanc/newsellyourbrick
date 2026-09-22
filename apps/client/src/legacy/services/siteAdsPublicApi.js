import { getApiBaseUrlSync } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'

let cachedAds = null
let cachedPromise = null

/** Публичный список рекламы — без newsApi / marketer token. */
export async function fetchActiveSiteAds() {
  if (cachedAds) return cachedAds
  if (cachedPromise) return cachedPromise

  cachedPromise = (async () => {
    const base = `${getApiBaseUrlSync()}/news`
    const res = await fetchDedupe(`${base}/ads`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить рекламу')
    cachedAds = data.ads || []
    return cachedAds
  })()

  try {
    return await cachedPromise
  } finally {
    cachedPromise = null
  }
}
