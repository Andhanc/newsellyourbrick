import { fetchDedupe } from './fetchDedupe'

/** Единый uid для дедупа (как на сервере в search-options). */
export function getPropertyCatalogUid(prop) {
  return `${prop.property_type || prop.type || 'property'}:${prop.id}`
}

/**
 * Тот же набор объявлений, что и для search-options (без lang — иначе ломается разбор адреса).
 */
export async function fetchSearchCatalogProperties(apiBaseUrl) {
  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  const [approvedResponse, auctionResponse, debtsResponse, sharesResponse] = await Promise.all([
    fetchDedupe(`${base}/properties/approved`),
    fetchDedupe(`${base}/properties/auctions`),
    fetchDedupe(`${base}/properties/debts`),
    fetchDedupe(`${base}/properties/shares?limit=10000`),
  ])

  const allProperties = []
  const pushList = (response) => {
    if (!response?.ok) return
    return response.json().then((data) => {
      if (data?.success && Array.isArray(data.data)) {
        allProperties.push(...data.data)
      }
    })
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
