/**
 * Кэш списка объявлений для страницы аукциона.
 * Позволяет показывать объекты сразу при переходе на /auction без "Загрузка объявлений...".
 * Prefetch при старте приложения — один запрос, без пулинга.
 */

import { getApiBaseUrl } from '../utils/apiConfig'

function pickNonEmptyTimerDate(a, b) {
  if (a != null && a !== '') return a
  if (b != null && b !== '') return b
  return null
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
  return {
    ...merged,
    test_timer_end_date: tt,
    test_timer_duration: existing.test_timer_duration ?? incoming.test_timer_duration ?? null,
    isAuction,
    endTime: isAuction ? tt || existing.endTime || incoming.endTime : existing.endTime || incoming.endTime,
    currentBid: isAuction
      ? (incoming.currentBid ??
          existing.currentBid ??
          incoming.auction_starting_price ??
          existing.auction_starting_price ??
          incoming.price ??
          existing.price ??
          0)
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
  return {
    ...prop,
    title: prop.title || prop.name || '',
    location: prop.location || '',
    price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
    currentBid: isAuction ? (prop.currentBid || prop.auction_starting_price || prop.price || 0) : null,
    endTime: isAuction ? (prop.test_timer_end_date || prop.endTime || prop.auction_end_date || null) : null,
    isAuction,
    test_timer_end_date: prop.test_timer_end_date || null,
    images: prop.images || (prop.image ? [prop.image] : []),
    image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
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

export function hasCachedList() {
  return cachedList.length > 0
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

  const allProperties = dedupeAuctionListById([
    ...allTestProperties.map(p => formatPropertyForList(p, true)),
    ...allAuctionProperties.map(p => formatPropertyForList(p, true)),
    ...allNonAuctionProperties.map(p => formatPropertyForList(p, false))
  ])

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
