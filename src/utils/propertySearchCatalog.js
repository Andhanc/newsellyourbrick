import { fetchDedupe } from './fetchDedupe'
import { normalizeListingLanguage } from './listingLanguage'

/** Единый uid для дедупа (как на сервере в search-options). */
export function getPropertyCatalogUid(prop) {
  return `${prop.property_type || prop.type || 'property'}:${prop.id}`
}

function withListingLang(path, lang) {
  const code = normalizeListingLanguage(lang)
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}lang=${encodeURIComponent(code)}`
}

/**
 * Тот же набор объявлений, что и для search-options.
 * lang обязателен: карточки должны совпадать с переводом на странице долей.
 * Страна в переведённом адресе разбирается через matchCountryKey.
 */
export async function fetchSearchCatalogProperties(apiBaseUrl, lang) {
  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  const [approvedResponse, auctionResponse, debtsResponse, sharesResponse] = await Promise.all([
    fetchDedupe(withListingLang(`${base}/properties/approved`, lang)),
    fetchDedupe(withListingLang(`${base}/properties/auctions`, lang)),
    fetchDedupe(withListingLang(`${base}/properties/debts`, lang)),
    fetchDedupe(withListingLang(`${base}/properties/shares?limit=10000`, lang)),
  ])

  const allProperties = []

  const pushList = async (response) => {
    if (!response?.ok) return
    try {
      const data = await response.json()
      if (data?.success && Array.isArray(data.data)) {
        allProperties.push(...data.data)
      }
    } catch {
      // ignore broken endpoint payload
    }
  }

  await Promise.all([
    pushList(approvedResponse),
    pushList(auctionResponse),
    pushList(debtsResponse),
    pushList(sharesResponse),
  ])

  const seenIds = new Set()
  const deduped = []
  for (const p of allProperties) {
    const uid = getPropertyCatalogUid(p)
    if (p.id == null || seenIds.has(uid)) continue
    seenIds.add(uid)
    deduped.push(p)
  }

  return deduped
}
