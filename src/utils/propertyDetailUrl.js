import { getStoredNumericUserId } from '../services/authService'

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

/** Query для /property/:id (classic UI + однозначный тип в API). */
export function buildPropertyDetailSearch({ property = null, classic = false } = {}) {
  const params = new URLSearchParams()
  if (classic) params.set('classic', '1')
  const pt = normalizePropertyTypeForDetailQuery(property)
  if (pt) params.set('property_type', pt)
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function getPropertyDetailPath(propertyId, options = {}) {
  if (propertyId == null || propertyId === '') return '/'
  const search = buildPropertyDetailSearch(options)
  return `/property/${propertyId}${search}`
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
