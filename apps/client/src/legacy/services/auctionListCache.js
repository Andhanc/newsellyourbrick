/**
 * Кэш списка объявлений для страницы аукциона.
 * Позволяет показывать объекты сразу при переходе на /auction без "Загрузка объявлений...".
 * Prefetch при старте приложения — один запрос, без пулинга.
 */

import { getApiBaseUrlSync } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'
import { getStoredNumericUserId } from '../services/authService'
import { compositeBidAmountKey, propertyBidsApiQuery, resolvePropertySourceTable } from '../utils/propertySourceTable'
import { fetchAuctionMaxBidsBatch, getMaxBidForProperty } from '../utils/fetchAuctionMaxBids'
import { auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import { normalizePropertyMediaFields } from '../utils/propertyImage'
import {
  resolveAuctionCurrentBidValue,
  setAuctionBidOverride as setBidOverride,
} from '../utils/auctionBidValue'

export { resolveAuctionCurrentBidValue } from '../utils/auctionBidValue'

function pickNonEmptyTimerDate(a, b) {
  if (a != null && a !== '') return a
  if (b != null && b !== '') return b
  return null
}

function asFiniteNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Один id мог прийти и из test-timers, и из approved — объединяем, чтобы круговой таймер не терялся. */
function mergeFormattedAuctionListItems(existing, incoming) {
  const tt = pickNonEmptyTimerDate(existing.test_timer_end_date, incoming.test_timer_end_date)
  const hasTT = tt != null && tt !== ''
  const isAuction =
    existing.isAuction === true ||
    incoming.isAuction === true ||
    hasTT ||
    existing.is_auction === true ||
    existing.is_auction === 1 ||
    incoming.is_auction === true ||
    incoming.is_auction === 1

  const merged = { ...existing, ...incoming }
  const endTimeForList = isAuction ? getEffectiveAuctionEndTime(merged) : merged.endTime ?? existing.endTime ?? incoming.endTime
  return {
    ...merged,
    test_timer_end_date: tt,
    test_timer_duration: existing.test_timer_duration ?? incoming.test_timer_duration ?? null,
    isAuction,
    endTime: endTimeForList,
    currentBid: isAuction
      ? Math.max(resolveAuctionCurrentBidValue(existing), resolveAuctionCurrentBidValue(incoming))
      : incoming.currentBid ?? existing.currentBid,
  }
}

function dedupeAuctionListMergedSources(items) {
  const map = new Map()
  for (const p of items) {
    if (p?.id == null) continue
    const key = auctionListingDedupeKey(p)
    const prev = map.get(key)
    map.set(key, prev ? mergeFormattedAuctionListItems(prev, p) : p)
  }
  return Array.from(map.values())
}

function formatPropertyForList(prop, isAuction) {
  const { image: normalizedImage, images: normalizedImages } = normalizePropertyMediaFields(prop)
  return {
    ...prop,
    title: prop.title || prop.name || '',
    location: prop.location || '',
    price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
    currentBid: isAuction ? resolveAuctionCurrentBidValue(prop) : null,
    endTime: isAuction ? getEffectiveAuctionEndTime(prop) : null,
    isAuction,
    test_timer_end_date: prop.test_timer_end_date || null,
    images: normalizedImages,
    image: normalizedImage,
    rooms: prop.rooms || prop.beds || 0,
    beds: prop.bedrooms || prop.rooms || prop.beds || 0,
    bedrooms: prop.bedrooms || prop.rooms || 0,
    bathrooms: prop.bathrooms || 0,
    area: prop.area || prop.sqft || 0,
    sqft: prop.area || prop.sqft || 0,
    floor: prop.floor || null,
    total_floors: prop.total_floors || prop.totalFloors || null,
    year_built: prop.year_built || null,
    land_area: prop.land_area || null,
    renovation: prop.renovation || null,
    condition: prop.condition || null,
    heating: prop.heating || null,
    water_supply: prop.water_supply || null,
    sewerage: prop.sewerage || null
  }
}

let cachedList = []
let cacheTimestamp = 0

export function getCachedList() {
  return cachedList.length ? [...cachedList] : []
}

export function setCachedList(list) {
  cachedList = Array.isArray(list) ? [...list] : []
  cacheTimestamp = Date.now()
}

export function patchCachedAuctionPropertyBid(propertyId, bidAmount, sourceTable) {
  const id = Number(propertyId)
  const nextBid = asFiniteNumberOrNull(bidAmount)
  if (!Number.isFinite(id) || nextBid == null) return false
  const table = resolvePropertySourceTable({ source_table: sourceTable })
  const matchKey = compositeBidAmountKey(id, table)
  setBidOverride(id, nextBid, table)
  if (!Array.isArray(cachedList) || cachedList.length === 0) return true

  let updated = false
  cachedList = cachedList.map((item) => {
    if (compositeBidAmountKey(item.id, resolvePropertySourceTable(item)) !== matchKey) return item
    updated = true
    const current = resolveAuctionCurrentBidValue(item)
    return {
      ...item,
      currentBid: Math.max(current, nextBid),
    }
  })

  if (updated) cacheTimestamp = Date.now()
  return updated
}

export function hasCachedList() {
  return cachedList.length > 0
}

async function fetchMaxBidForProperty(apiBaseUrl, propertyId, sourceTable) {
  const id = Number(propertyId)
  if (!Number.isFinite(id)) return null
  const table = resolvePropertySourceTable({ source_table: sourceTable })
  try {
    const response = await fetch(
      `${apiBaseUrl}/bids/property/${id}?${propertyBidsApiQuery(id, table)}`,
    )
    if (!response.ok) return null
    const payload = await response.json()
    const bids = payload?.success && Array.isArray(payload?.data) ? payload.data : []
    if (bids.length === 0) return null
    const max = Math.max(
      ...bids
        .map((b) => asFiniteNumberOrNull(b?.bid_amount))
        .filter((v) => v != null)
    )
    return Number.isFinite(max) ? max : null
  } catch {
    return null
  }
}

/** Параллельные вызовы fetchAuctionList с одинаковым viewer_user_id сливаем в один промис. */
const fetchAuctionListInFlightByKey = new Map()

function isPrivateClubLotForAuctionSort(p) {
  const v = p?.private_club_only
  return v === 1 || v === true || v === '1'
}

function auctionListEndSortKey(p) {
  const raw = p?.endTime ?? p?.test_timer_end_date ?? p?.auction_end_date ?? ''
  const t = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(t) ? t : 0
}

/** VIP-лоты закрытого клуба — в начале списка, далее по дате окончания аукциона. */
function sortAuctionListPrivateClubFirst(list) {
  if (!Array.isArray(list) || list.length <= 1) return list
  return [...list].sort((a, b) => {
    const d =
      (isPrivateClubLotForAuctionSort(b) ? 1 : 0) - (isPrivateClubLotForAuctionSort(a) ? 1 : 0)
    if (d !== 0) return d
    return auctionListEndSortKey(a) - auctionListEndSortKey(b)
  })
}

async function enrichAuctionListWithMaxBids(apiBaseUrl, list) {
  if (!Array.isArray(list) || list.length === 0) return list
  const auctionItems = list.filter((item) => {
    if (!item) return false
    return (
      item.isAuction === true ||
      item.is_auction === true ||
      item.is_auction === 1 ||
      (item.test_timer_end_date != null && item.test_timer_end_date !== '')
    )
  })
  if (auctionItems.length === 0) return list

  let bidByKey = await fetchAuctionMaxBidsBatch(apiBaseUrl, auctionItems)

  if (bidByKey.size === 0) {
    const bidEntries = await Promise.all(
      auctionItems.map(async (item) => {
        const maxBid = await fetchMaxBidForProperty(
          apiBaseUrl,
          item.id,
          item.source_table ?? item.sourceTable,
        )
        return {
          key: compositeBidAmountKey(item.id, resolvePropertySourceTable(item)),
          maxBid,
        }
      }),
    )
    bidByKey = new Map()
    bidEntries.forEach((entry) => {
      if (!entry.key || entry.maxBid == null) return
      const prev = bidByKey.get(entry.key)
      bidByKey.set(entry.key, prev == null ? entry.maxBid : Math.max(prev, entry.maxBid))
    })
  }

  if (bidByKey.size === 0) return list

  return list.map((item) => {
    const maxBid = getMaxBidForProperty(bidByKey, item)
    if (maxBid == null) return item
    const current = resolveAuctionCurrentBidValue(item)
    const nextBid = Math.max(current, maxBid)
    setBidOverride(item, nextBid)
    return {
      ...item,
      currentBid: nextBid,
    }
  })
}

/**
 * Загружает список объявлений для /auction.
 * @param {number|string|null|undefined} explicitViewerUserId — id в БД для VIP-лотов; по умолчанию из localStorage.
 */
export async function fetchAuctionList(explicitViewerUserId) {
  const resolved =
    explicitViewerUserId !== undefined ? explicitViewerUserId : getStoredNumericUserId()
  const viewerKey =
    resolved != null &&
    String(resolved).trim() !== '' &&
    Number.isFinite(Number(resolved)) &&
    Number(resolved) >= 1
      ? String(Number(resolved))
      : ''

  const existing = fetchAuctionListInFlightByKey.get(viewerKey)
  if (existing) return existing

  const promise = (async () => {
  const API_BASE_URL = getApiBaseUrlSync()
  const lang = (() => {
    try {
      if (typeof window === 'undefined') return 'ru'
      const raw = window.localStorage?.getItem('i18nextLng') || 'ru'
      return String(raw).split('-')[0] || 'ru'
    } catch {
      return 'ru'
    }
  })()

  const allAuctionProperties = []
  const allNonAuctionProperties = []
  const allDebtProperties = []
  let allTestProperties = []

  const langQ = encodeURIComponent(lang)
  const viewerQ = viewerKey ? `&viewer_user_id=${encodeURIComponent(viewerKey)}` : ''
  try {
    /** test-timers не использует lang на бэкенде — без query для лучшего попадания в серверный кэш */
    const [testRes, auctionAllRes, approvedAllRes, debtsRes] = await Promise.all([
      fetchDedupe(`${API_BASE_URL}/properties/test-timers`),
      fetchDedupe(`${API_BASE_URL}/properties/auctions?lang=${langQ}${viewerQ}`),
      fetchDedupe(`${API_BASE_URL}/properties/approved?lang=${langQ}`),
      fetchDedupe(`${API_BASE_URL}/properties/debts`),
    ])

    if (testRes.ok) {
      const data = await testRes.json().catch(() => null)
      if (data?.success && data.data) allTestProperties = data.data
    }
    if (auctionAllRes.ok) {
      const data = await auctionAllRes.json().catch(() => null)
      if (data?.success && data.data) allAuctionProperties.push(...data.data)
    }
    if (approvedAllRes.ok) {
      const data = await approvedAllRes.json().catch(() => null)
      if (data?.success && data.data) {
        const nonAuction = data.data.filter(
          prop => !prop.is_auction || prop.is_auction === 0 || prop.is_auction === false
        )
        allNonAuctionProperties.push(...nonAuction)
      }
    }
    if (debtsRes.ok) {
      const data = await debtsRes.json().catch(() => null)
      if (data?.success && data.data) allDebtProperties.push(...data.data)
    }
  } catch (_) {}

  const baseList = dedupeAuctionListMergedSources([
    ...allTestProperties.map(p => formatPropertyForList(p, true)),
    ...allAuctionProperties.map(p => formatPropertyForList(p, true)),
    ...allNonAuctionProperties.map(p => formatPropertyForList(p, false)),
    ...allDebtProperties.map((p) => formatPropertyForList(
      p,
      p?.is_auction === 1 ||
      p?.is_auction === true ||
      (p?.test_timer_end_date != null && p?.test_timer_end_date !== '')
    ))
  ])

  const allProperties = sortAuctionListPrivateClubFirst(
    await enrichAuctionListWithMaxBids(API_BASE_URL, baseList)
  )

  setCachedList(allProperties)
  return allProperties
  })()

  fetchAuctionListInFlightByKey.set(viewerKey, promise)
  try {
    return await promise
  } finally {
    fetchAuctionListInFlightByKey.delete(viewerKey)
  }
}

/**
 * Один раз при старте приложения подгружаем список в кэш.
 * При переходе на /auction данные уже будут — без экрана "Загрузка объявлений...".
 */
export function prefetchAuctionList() {
  fetchAuctionList().catch(err => console.error('❌ Prefetch auction list:', err))
}
