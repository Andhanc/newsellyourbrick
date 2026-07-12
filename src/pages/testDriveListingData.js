function parseTestDriveData(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const TYPE_FILTER_ALIASES = {
  'вилла': ['villa'],
  'апартаменты': ['apartment', 'apartments', 'commercial', 'flat'],
  'таунхаус': ['townhouse', 'town_house'],
  'дом': ['house'],
  'пентхаус': ['penthouse'],
}

export function matchesSelectedTestDriveType(type, selectedTypes) {
  if (!selectedTypes.length) return true

  const normalizedType = String(type || '').trim().toLowerCase()
  return selectedTypes.some((selectedType) => {
    const normalizedSelectedType = String(selectedType || '').trim().toLowerCase()
    return (
      normalizedType === normalizedSelectedType ||
      TYPE_FILTER_ALIASES[normalizedSelectedType]?.includes(normalizedType)
    )
  })
}

export function isWithinSelectedTestDrivePrice(listingPrice, selectedPrice, unboundedPrice = 500) {
  return selectedPrice >= unboundedPrice || Number(listingPrice) <= selectedPrice
}

export function mapRealTestDriveListing(property, index, { id, image }) {
  const testDriveData = parseTestDriveData(property.test_drive_data)

  return {
    ...property,
    id,
    image,
    title: property.title || property.name || '',
    location: property.location || property.address || '',
    city: property.city || property.location_city || '',
    type: property.type || property.property_type || '',
    bedrooms: property.bedrooms ?? property.rooms ?? property.beds ?? null,
    bathrooms: property.bathrooms ?? property.baths ?? null,
    area: property.area ?? property.sqft ?? property.living_area ?? null,
    price: Number(testDriveData.price_per_day ?? property.test_drive_price_per_day) || 0,
    rating: 4.6 + (index % 4) / 10,
    reviews: 14 + index,
    stayDays: 5,
    originalProperty: property,
  }
}

export function realTestDriveListings(apiListings, mapListing) {
  if (!Array.isArray(apiListings)) return []
  return apiListings.map(mapListing)
}
