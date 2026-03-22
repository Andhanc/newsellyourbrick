/**
 * Единый ключ избранного: таблица БД + id объекта.
 * На API в source_table приходят 'apartments' | 'houses' или полные имена таблиц.
 */

export function normalizePropertyTable(raw) {
  if (raw == null || raw === '') return 'properties_apartments'
  const s = String(raw).toLowerCase()
  if (s === 'apartments' || s === 'properties_apartments') return 'properties_apartments'
  if (s === 'houses' || s === 'properties_houses') return 'properties_houses'
  if (s === 'properties') return 'properties'
  return 'properties_apartments'
}

export function favoriteCompositeKey(propertyId, sourceTable) {
  return `${normalizePropertyTable(sourceTable)}:${Number(propertyId)}`
}

/** Объект с сервера (аукцион / главная из API) — можно сохранять в БД */
export function hasDbBackedProperty(property) {
  return (
    property != null &&
    property.id != null &&
    property.source_table != null &&
    String(property.source_table).trim() !== ''
  )
}
