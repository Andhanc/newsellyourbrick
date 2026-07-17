function createdAtTime(row) {
  const time = new Date(row?.created_at || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

export function mergeShareRowsPage(apartments = [], houses = [], offset = 0, limit = 100) {
  const taggedApartments = apartments.map((row) => ({
    ...row,
    source_table: 'properties_apartments',
  }))
  const taggedHouses = houses.map((row) => ({
    ...row,
    source_table: 'properties_houses',
  }))
  const safeOffset = Math.max(0, Number(offset) || 0)
  const safeLimit = Math.max(1, Number(limit) || 100)

  return [...taggedApartments, ...taggedHouses]
    .sort((left, right) => createdAtTime(right) - createdAtTime(left))
    .slice(safeOffset, safeOffset + safeLimit)
}

export function formatShareMarketplaceApiItem(property = {}, photos = []) {
  const totalShares = property.total_shares != null ? Number(property.total_shares) : null
  const sharesSold = property.shares_sold != null ? Number(property.shares_sold) : null
  const price = property.price != null ? Number(property.price) : null
  const sourceTable = String(property.source_table || '').trim()
  const normalizedPhotos = Array.isArray(photos) ? photos : []

  return {
    ...property,
    source_table: sourceTable,
    photos: normalizedPhotos,
    images: normalizedPhotos,
    id: property.id,
    property_type: property.property_type,
    shareId: sourceTable && property.id != null ? `${sourceTable}-${property.id}` : '',
    title: property.title,
    location: property.location || '',
    description: property.description || '',
    image: normalizedPhotos[0] || '',
    totalPrice: Number.isFinite(price) ? price : null,
    pricePerShare:
      Number.isFinite(price) && Number.isFinite(totalShares) && totalShares > 0
        ? price / totalShares
        : null,
    totalShares: Number.isFinite(totalShares) ? totalShares : null,
    sharesSold: Number.isFinite(sharesSold) ? sharesSold : null,
    area: property.area,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
  }
}
