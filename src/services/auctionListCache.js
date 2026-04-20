/**
 * Кэш списка объявлений для страницы аукциона.
 * Позволяет показывать объекты сразу при переходе на /auction без "Загрузка объявлений...".
 * Prefetch при старте приложения — один запрос, без пулинга.
 */

import { getApiBaseUrl } from '../utils/apiConfig'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import { normalizePropertyMediaFields } from '../utils/propertyImage'

const BID_OVERRIDES_STORAGE_KEY = 'syb_auction_bid_overrides_v1'

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

const bidOverrides = new Map()
let bidOverridesLoaded = false

function ensureBidOverridesLoaded() {
  if (bidOverridesLoaded) return
  bidOverridesLoaded = true
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    const raw = window.sessionStorage.getItem(BID_OVERRIDES_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    Object.entries(parsed).forEach(([k, v]) => {
      const id = Number(k)
      const bid = asFiniteNumberOrNull(v)
      if (Number.isFinite(id) && bid != null) {
        bidOverrides.set(id, bid)
      }
    })
  } catch {
    /* ignore storage parse errors */
  }
}

function persistBidOverrides() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    const payload = {}
    bidOverrides.forEach((v, k) => {
      payload[String(k)] = v
    })
    window.sessionStorage.setItem(BID_OVERRIDES_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore storage write errors */
  }
}

function getBidOverrideForProperty(prop) {
  ensureBidOverridesLoaded()
  const id = Number(prop?.id)
  if (!Number.isFinite(id)) return null
  const value = bidOverrides.get(id)
  return value != null ? value : null
}

function setBidOverride(propertyId, bidAmount) {
  ensureBidOverridesLoaded()
  const id = Number(propertyId)
  const bid = asFiniteNumberOrNull(bidAmount)
  if (!Number.isFinite(id) || bid == null) return false
  const prev = bidOverrides.get(id)
  const next = prev == null ? bid : Math.max(prev, bid)
  bidOverrides.set(id, next)
  persistBidOverrides()
  return true
}

export function resolveAuctionCurrentBidValue(prop) {
  if (!prop) return 0
  const candidates = [
    asFiniteNumberOrNull(prop.currentBid),
    asFiniteNumberOrNull(prop.current_bid),
    asFiniteNumberOrNull(prop.max_bid),
    asFiniteNumberOrNull(prop.highest_bid),
    asFiniteNumberOrNull(prop.auction_current_bid),
    asFiniteNumberOrNull(prop.auction_starting_price),
    getBidOverrideForProperty(prop),
  ].filter((v) => v != null)
  if (candidates.length === 0) return 0
  return Math.max(...candidates)
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

function dedupeAuctionListById(items) {
  const map = new Map()
  for (const p of items) {
    if (p?.id == null) continue
    const n = Number(p.id)
    const key = Number.isFinite(n) ? n : String(p.id)
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

export function patchCachedAuctionPropertyBid(propertyId, bidAmount) {
  const id = Number(propertyId)
  const nextBid = asFiniteNumberOrNull(bidAmount)
  if (!Number.isFinite(id) || nextBid == null) return false
  setBidOverride(id, nextBid)
  if (!Array.isArray(cachedList) || cachedList.length === 0) return true

  let updated = false
  cachedList = cachedList.map((item) => {
    if (Number(item?.id) !== id) return item
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

async function fetchMaxBidForProperty(apiBaseUrl, propertyId) {
  const id = Number(propertyId)
  if (!Number.isFinite(id)) return null
  try {
    const response = await fetch(`${apiBaseUrl}/bids/property/${id}`)
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

  const bidEntries = await Promise.all(
    auctionItems.map(async (item) => {
      const maxBid = await fetchMaxBidForProperty(apiBaseUrl, item.id)
      return { id: Number(item.id), maxBid }
    })
  )

  const bidById = new Map()
  bidEntries.forEach((entry) => {
    if (!Number.isFinite(entry.id) || entry.maxBid == null) return
    const prev = bidById.get(entry.id)
    bidById.set(entry.id, prev == null ? entry.maxBid : Math.max(prev, entry.maxBid))
  })

  if (bidById.size === 0) return list

  return list.map((item) => {
    const id = Number(item?.id)
    const maxBid = bidById.get(id)
    if (!Number.isFinite(id) || maxBid == null) return item
    const current = resolveAuctionCurrentBidValue(item)
    const nextBid = Math.max(current, maxBid)
    setBidOverride(id, nextBid)
    return {
      ...item,
      currentBid: nextBid,
    }
  })
}

/**
 * Загружает список объявлений (тот же набор запросов, что и на странице аукциона).
 * Сохраняет результат в кэш. Можно вызывать при старте приложения и из Home.
 */
export async function fetchAuctionList() {
  const API_BASE_URL = await getApiBaseUrl()
  const types = [
    { apiType: 'commercial' },
    { apiType: 'villa' },
    { apiType: 'apartment' },
    { apiType: 'house' }
  ]
  const allAuctionProperties = []
  const allNonAuctionProperties = []
  let allTestProperties = []

  try {
    const testRes = await fetch(`${API_BASE_URL}/properties/test-timers`)
    if (testRes.ok) {
      const data = await testRes.json()
      if (data.success && data.data) allTestProperties = data.data
    }
  } catch (_) {}

  for (const { apiType } of types) {
    try {
      const [auctionRes, approvedRes] = await Promise.all([
        fetch(`${API_BASE_URL}/properties/auctions?type=${apiType}`),
        fetch(`${API_BASE_URL}/properties/approved?type=${apiType}`)
      ])
      if (auctionRes.ok) {
        const data = await auctionRes.json()
        if (data.success && data.data) {
          const nonTest = data.data.filter(prop => !prop.test_timer_end_date)
          allAuctionProperties.push(...nonTest)
        }
      }
      if (approvedRes.ok) {
        const data = await approvedRes.json()
        if (data.success && data.data) {
          const nonAuction = data.data.filter(
            prop => !prop.is_auction || prop.is_auction === 0 || prop.is_auction === false
          )
          allNonAuctionProperties.push(...nonAuction)
        }
      }
    } catch (_) {}
  }

  const baseList = dedupeAuctionListById([
    ...allTestProperties.map(p => formatPropertyForList(p, true)),
    ...allAuctionProperties.map(p => formatPropertyForList(p, true)),
    ...allNonAuctionProperties.map(p => formatPropertyForList(p, false))
  ])

  const allProperties = await enrichAuctionListWithMaxBids(API_BASE_URL, baseList)

  setCachedList(allProperties)
  return allProperties
}

/**
 * Один раз при старте приложения подгружаем список в кэш.
 * При переходе на /auction данные уже будут — без экрана "Загрузка объявлений...".
 */
export function prefetchAuctionList() {
  fetchAuctionList().catch(err => console.error('❌ Prefetch auction list:', err))
}
