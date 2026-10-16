// Take turns between buying formats so the short rail stays varied.
export function selectDiscoverTopListings(groups, limit = 5) {
  const result = []
  const seen = new Set()
  const queues = groups.map(({ kind, items = [] }) => ({ kind, items: [...items] }))
  while (result.length < limit && queues.some((group) => group.items.length)) {
    for (const group of queues) {
      while (group.items.length && result.length < limit) {
        const property = group.items.shift()
        if (property?.id == null) continue
        const rawSource = String(property.source_table || property.property_table || '').toLowerCase()
        const type = String(property.property_type || '').toLowerCase()
        const source = rawSource.includes('house') || ['house', 'villa'].includes(type)
          ? 'houses'
          : rawSource.includes('apartment') || ['apartment', 'commercial'].includes(type)
            ? 'apartments'
            : rawSource || type
        const key = `${source}:${property.id}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ kind: group.kind, property, key })
        break
      }
    }
  }
  return result
}
