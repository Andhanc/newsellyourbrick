/** Тип таблицы объекта из ставки → query property_type для GET /api/properties/:id */
export function propertyTypeQueryFromBid(bid) {
  if (bid?.property_table === 'properties_houses') return 'house'
  if (bid?.property_table === 'properties_apartments') return 'apartment'
  const pt = String(bid?.property_type || '').toLowerCase()
  if (pt === 'house' || pt === 'villa') return 'house'
  if (pt === 'apartment' || pt === 'commercial') return 'apartment'
  return 'apartment'
}

function bidHasListingSpecs(bid) {
  return (
    bid?.area != null ||
    bid?.sqft != null ||
    bid?.living_area != null ||
    bid?.rooms != null ||
    bid?.bedrooms != null ||
    bid?.bathrooms != null ||
    bid?.baths != null
  )
}

/**
 * Дополняет ставки полями площади/комнат из карточки объекта (если API ставок их не вернул).
 */
export async function enrichBidsWithPropertySpecs(bids, apiBase) {
  if (!Array.isArray(bids) || bids.length === 0) return bids

  const base = String(apiBase || '/api').replace(/\/$/, '')

  return Promise.all(
    bids.map(async (bid) => {
      if (bidHasListingSpecs(bid)) return bid

      const propertyType = propertyTypeQueryFromBid(bid)
      const propertyId = bid?.property_id
      if (propertyId == null) return bid

      try {
        const res = await fetch(
          `${base}/properties/${propertyId}?property_type=${encodeURIComponent(propertyType)}`,
        )
        if (!res.ok) return bid
        const json = await res.json()
        const p = json?.data
        if (!p || typeof p !== 'object') return bid

        const area = p.area ?? p.living_area ?? null
        const rooms = p.rooms ?? p.bedrooms ?? null
        const bathrooms = p.bathrooms ?? p.baths ?? null

        return {
          ...bid,
          area,
          sqft: area,
          living_area: p.living_area ?? null,
          bedrooms: p.bedrooms ?? null,
          rooms,
          bathrooms,
          baths: bathrooms,
        }
      } catch {
        return bid
      }
    }),
  )
}
