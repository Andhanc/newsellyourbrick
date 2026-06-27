/** @typedef {{ property_type?: string, title?: string, name?: string, id?: number | string, slug?: string | null }} PropertySlugSource */

const CYRILLIC_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Латиница + транслит для slug (URL только a-z0-9-). */
export function slugifyLatin(text) {
  const base = String(text || '')
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  return base
}

export function propertyTypeToSlugPrefix(propertyType) {
  const t = String(propertyType || '').trim().toLowerCase()
  if (t === 'villa') return 'villa'
  if (t === 'house') return 'house'
  if (t === 'commercial') return 'commercial'
  return 'apartment'
}

/**
 * ЧПУ объекта: {type}-{title-slug}-{id}
 * @param {{ property_type?: string, title?: string, name?: string, id?: number | string }} params
 */
export function buildPropertySlug({ property_type, title, name, id }) {
  const prefix = propertyTypeToSlugPrefix(property_type)
  const titlePart = slugifyLatin(title || name) || 'listing'
  const idPart = Number(id)
  if (!Number.isFinite(idPart) || idPart <= 0) return ''
  return `${prefix}-${titlePart}-${idPart}`.replace(/-+/g, '-').slice(0, 200)
}

export function isNumericPropertyRouteParam(param) {
  return /^\d+$/.test(String(param ?? ''))
}

/** Извлекает numeric id из slug или чистого id. */
export function parseIdFromPropertySlug(param) {
  const s = String(param ?? '').trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number(s)
  const m = s.match(/-(\d+)$/)
  if (m) return Number(m[1])
  return null
}

/** @param {PropertySlugSource | null | undefined} property */
export function getPropertySlugFromRecord(property) {
  if (!property) return ''
  const stored = String(property.slug || '').trim()
  if (stored) return stored
  if (property.id == null) return ''
  return buildPropertySlug({
    property_type: property.property_type,
    title: property.title || property.name,
    id: property.id,
  })
}

/** Префикс типа из slug (villa-foo-1 → villa). */
export function parseTypePrefixFromPropertySlug(param) {
  const s = String(param ?? '').trim()
  if (!s || isNumericPropertyRouteParam(s)) return ''
  const idx = s.indexOf('-')
  if (idx <= 0) return ''
  return s.slice(0, idx).toLowerCase()
}

const PREFIX_TO_PROPERTY_TYPE = {
  villa: 'villa',
  house: 'house',
  commercial: 'commercial',
  apartment: 'apartment',
}

export function propertyTypeHintFromSlug(param) {
  const prefix = parseTypePrefixFromPropertySlug(param)
  return PREFIX_TO_PROPERTY_TYPE[prefix] || ''
}
