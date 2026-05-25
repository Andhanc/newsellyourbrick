/**
 * Таблица-источник объекта (properties_apartments | properties_houses | properties).
 * Обязательна для ставок: numeric id не уникален между таблицами.
 */
export function resolvePropertySourceTable(prop) {
  if (!prop) return 'properties_apartments'
  const raw =
    prop.source_table != null && String(prop.source_table).trim() !== ''
      ? String(prop.source_table).trim()
      : prop.sourceTable != null && String(prop.sourceTable).trim() !== ''
        ? String(prop.sourceTable).trim()
        : prop.property_table != null && String(prop.property_table).trim() !== ''
          ? String(prop.property_table).trim()
          : null
  if (raw === 'apartments') return 'properties_apartments'
  if (raw === 'houses') return 'properties_houses'
  if (raw) return raw
  const pt = String(prop.property_type || prop.propertyType || '').toLowerCase()
  if (pt === 'house' || pt === 'villa') return 'properties_houses'
  if (pt === 'apartment' || pt === 'commercial') return 'properties_apartments'
  return 'properties_apartments'
}

export function propertyBidsApiQuery(propertyId, sourceTable) {
  const table = resolvePropertySourceTable({ source_table: sourceTable })
  return `property_table=${encodeURIComponent(table)}`
}

/** Ключ для мапы макс. ставок (id уникален только внутри таблицы). */
export function compositeBidAmountKey(propertyId, sourceTable) {
  const table = resolvePropertySourceTable({ source_table: sourceTable })
  return `${table}:${Number(propertyId)}`
}
