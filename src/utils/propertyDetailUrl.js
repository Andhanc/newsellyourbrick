import { getStoredNumericUserId } from '../services/authService'
import { getPropertySlugFromRecord } from './propertySlug.js'

/** Тип для GET /api/properties/:id?property_type= — снимает неоднозначность при одинаковых id в двух таблицах. */
const DISAMBIG_PROPERTY_TYPES = new Set(['apartment', 'commercial', 'house', 'villa'])

export function normalizePropertyTypeForDetailQuery(property) {
  if (!property || property.property_type == null) return ''
  const raw = String(property.property_type).trim().toLowerCase()
  return DISAMBIG_PROPERTY_TYPES.has(raw) ? raw : ''
}

export function normalizePropertyTypeQueryParam(raw) {
  if (raw == null || raw === '') return ''
  const t = String(raw).trim().toLowerCase()
  return DISAMBIG_PROPERTY_TYPES.has(t) ? t : ''
}

/** Query для /property/:slug (classic UI; property_type не нужен при ЧПУ). */
export function buildPropertyDetailSearch({ property = null, classic = false, useSlugPath = false } = {}) {
  const params = new URLSearchParams()
  if (classic) params.set('classic', '1')
  if (!useSlugPath) {
    const pt = normalizePropertyTypeForDetailQuery(property)
    if (pt) params.set('property_type', pt)
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

/**
 * @param {number | string | object | null | undefined} propertyOrId
 * @param {{ property?: object, classic?: boolean }} [options]
 */
export function getPropertyDetailPath(propertyOrId, options = {}) {
  let property = options.property ?? null
  let propertyId = propertyOrId

  if (propertyOrId && typeof propertyOrId === 'object') {
    property = propertyOrId
    propertyId = property.id
  }

  if (propertyId == null || propertyId === '') return '/'

  const slug = property ? getPropertySlugFromRecord(property) : ''
  const useSlugPath = Boolean(slug && !/^\d+$/.test(slug))
  const segment = useSlugPath ? slug : String(propertyId)
  const search = buildPropertyDetailSearch({ property, ...options, useSlugPath })
  return `/property/${segment}${search}`
}

/** Страница бронирования test-drive у объекта. */
export function getPropertyTestDrivePath(propertyOrId, options = {}) {
  const detail = getPropertyDetailPath(propertyOrId, options)
  if (!detail || detail === '/') return '/test-drive'
  const [pathOnly] = detail.split('?')
  return `${pathOnly}/test-drive`
}

/** Вкладка «История ставок» на странице объекта (PropertyDetailClassic). */
export const PROPERTY_DETAIL_AUCTION_TAB_BIDS = 'bids'

export function buildPropertyDetailNavigation(property, { auctionTab, ...pathOptions } = {}) {
  if (!property || property.id == null) {
    return { pathname: '/', state: {} }
  }
  const state = { property }
  if (auctionTab) state.auctionTab = auctionTab
  return {
    pathname: getPropertyDetailPath(property, pathOptions),
    state,
  }
}

/**
 * Добавляет viewer_user_id к URL GET /api/properties/:id (доступ к лотам «только VIP»).
 */
export function appendViewerUserIdToPropertyApiUrl(url) {
  if (typeof url !== 'string' || !url) return url
  const uid = getStoredNumericUserId()
  if (uid == null) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}viewer_user_id=${encodeURIComponent(String(uid))}`
}

/**
 * Числовой id уникален только внутри таблицы (apartments vs houses).
 * Использовать как ключ строки каталога / аукциона и при слиянии ответов API.
 */
export function auctionListingDedupeKey(p) {
  if (!p || p.id == null) return `:${Math.random().toString(36).slice(2)}`
  const idPart = String(p.id).trim()

  const st = String(p.source_table || p.property_table || '').toLowerCase()
  if (st.includes('house')) return `houses:${idPart}`
  if (st.includes('apartment') || st === 'apt') return `apartments:${idPart}`

  const pt = String(p.property_type || '').toLowerCase()
  if (pt === 'house' || pt === 'villa') return `houses:${idPart}`
  if (pt === 'apartment' || pt === 'commercial') return `apartments:${idPart}`

  return `id:${idPart}`
}
