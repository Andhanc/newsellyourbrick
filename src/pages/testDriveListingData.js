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

const AMENITY_FILTER_ALIASES = {
  'бассейн': ['pool', 'pool_private', 'pool_communal', 'pool_outdoor', 'бассейн'],
  'вид на море': ['sea_view', 'ocean_view', 'вид на море'],
  'терраса': ['terrace', 'rooftop_terrace', 'терраса'],
  'wi-fi': ['wifi', 'wi-fi', 'internet', 'интернет'],
  'парковка': ['parking', 'underground_parking', 'covered_parking', 'open_parking', 'surface_parking', 'parking_onsite', 'парковка'],
}

const DURATION_FILTER_RANGES = {
  '3-7 дней': [3, 7],
  '1-2 недели': [8, 14],
  '2-4 недели': [15, 28],
  '1-3 месяца': [29, 90],
  'Более 3 месяцев': [91, Number.POSITIVE_INFINITY],
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    if (typeof value === 'object') continue
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return null
}

function firstPositiveNumber(...values) {
  const number = firstFiniteNumber(...values)
  return number != null && number > 0 ? number : null
}

function firstNonNegativeNumber(...values) {
  const number = firstFiniteNumber(...values)
  return number != null && number >= 0 ? number : null
}

function collectAmenityTokens(listing) {
  const tokens = new Set()
  const addToken = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized) tokens.add(normalized)
  }

  const addCollection = (value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => addToken(typeof item === 'object' ? item?.key || item?.id || item?.name : item))
      return
    }
    if (typeof value !== 'string') return
    try {
      addCollection(JSON.parse(value))
    } catch {
      value.split(/[,;\n]/).forEach(addToken)
    }
  }

  addCollection(listing.amenities)
  addCollection(listing.tz_amenities_json)
  addCollection(listing.additional_amenities)

  if (listing.pool) tokens.add('pool')
  if (listing.parking) tokens.add('parking')
  if (listing.internet) tokens.add('internet')
  if (listing.terrace) tokens.add('terrace')
  if (listing.sea_view) tokens.add('sea_view')

  return tokens
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

export function matchesSelectedTestDriveAmenities(listing, selectedAmenities) {
  if (!selectedAmenities.length) return true

  const tokens = collectAmenityTokens(listing)
  return selectedAmenities.every((selectedAmenity) => {
    const normalizedAmenity = String(selectedAmenity || '').trim().toLowerCase()
    const aliases = AMENITY_FILTER_ALIASES[normalizedAmenity] || [normalizedAmenity]
    return aliases.some((alias) => tokens.has(alias))
  })
}

export function matchesSelectedTestDriveDurations(listing, selectedDurations) {
  if (!selectedDurations.length) return true

  const minStayDays = firstPositiveNumber(listing?.minStayDays)
  const maxStayDays = firstPositiveNumber(listing?.maxStayDays)
  if (minStayDays == null || maxStayDays == null || maxStayDays < minStayDays) return false

  return selectedDurations.some((selectedDuration) => {
    const range = DURATION_FILTER_RANGES[selectedDuration]
    if (!range) return false
    const [rangeStart, rangeEnd] = range
    return minStayDays <= rangeEnd && maxStayDays >= rangeStart
  })
}

export function isWithinSelectedTestDrivePrice(listingPrice, selectedPrice, unboundedPrice = 500) {
  if (selectedPrice >= unboundedPrice) return true
  const price = firstPositiveNumber(listingPrice)
  return price != null && price <= selectedPrice
}

export function sortTestDriveListings(listings, sort) {
  if (sort === 'price') {
    return [...listings].sort((a, b) => {
      const aPrice = firstPositiveNumber(a?.price)
      const bPrice = firstPositiveNumber(b?.price)
      if (aPrice == null) return bPrice == null ? 0 : 1
      if (bPrice == null) return -1
      return aPrice - bPrice
    })
  }

  if (sort === 'rating') {
    return [...listings].sort((a, b) => {
      const aRating = firstPositiveNumber(a?.rating)
      const bRating = firstPositiveNumber(b?.rating)
      if (aRating == null) return bRating == null ? 0 : 1
      if (bRating == null) return -1
      return bRating - aRating
    })
  }

  return listings
}

export function paginateTestDriveListings(listings, page, pageSize = 16) {
  const safePage = Math.max(1, Math.floor(Number(page)) || 1)
  const safePageSize = Math.max(1, Math.floor(Number(pageSize)) || 16)
  const start = (safePage - 1) * safePageSize
  return listings.slice(start, start + safePageSize)
}

export function mapRealTestDriveListing(property, index, { id, image }) {
  const testDriveData = parseTestDriveData(property.test_drive_data)
  const rating = firstPositiveNumber(
    property.rating,
    property.average_rating,
    property.avg_rating,
    testDriveData.rating,
  )
  const reviews = firstNonNegativeNumber(
    property.reviews_count,
    property.review_count,
    property.ratings_count,
    property.reviews,
    testDriveData.reviews_count,
  )
  const stayDays = firstPositiveNumber(
    testDriveData.stay_days,
    testDriveData.duration_days,
    property.test_drive_stay_days,
    property.stay_days,
  )
  const minStayDays = firstPositiveNumber(
    testDriveData.min_stay_days,
    testDriveData.minimum_stay_days,
    testDriveData.min_days,
    property.test_drive_min_days,
    property.min_stay_days,
  )
  const maxStayDays = firstPositiveNumber(
    testDriveData.max_stay_days,
    testDriveData.maximum_stay_days,
    testDriveData.max_days,
    property.test_drive_max_days,
    property.max_stay_days,
  )

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
    price: firstPositiveNumber(testDriveData.price_per_day, property.test_drive_price_per_day),
    rating: rating != null && rating <= 5 ? rating : null,
    reviews,
    stayDays,
    minStayDays,
    maxStayDays,
    originalProperty: property,
  }
}

export function realTestDriveListings(apiListings, mapListing) {
  if (!Array.isArray(apiListings)) return []
  return apiListings.map(mapListing)
}
