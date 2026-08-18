function toPositiveInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

function normalizeOwnerMatchText(value) {
  return String(value || '')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactOwnerMatchText(value) {
  return normalizeOwnerMatchText(value).replace(/\s+/g, '')
}

const GENERIC_OWNER_TITLES = new Set(['', 'без названия'])
const GENERIC_OWNER_LOCATIONS = new Set(['', 'не указано'])

function readListingSourcePurchasedPropertyId(listing) {
  if (!listing || listing.isPurchased) return null
  const fromRow = toPositiveInt(listing.sourcePurchasedPropertyId)
  if (fromRow) return fromRow
  const raw = listing.raw && typeof listing.raw === 'object' ? listing.raw : {}
  const fromRaw = toPositiveInt(raw.source_purchased_property_id ?? raw.sourcePurchasedPropertyId)
  if (fromRaw) return fromRaw
  const params = raw.tz_parameters_json ?? raw.tz_parameters ?? raw.parameters
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    return toPositiveInt(params.source_purchased_property_id ?? params.sourcePurchasedPropertyId)
  }
  if (typeof params === 'string') {
    try {
      const parsed = JSON.parse(params)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return toPositiveInt(parsed.source_purchased_property_id ?? parsed.sourcePurchasedPropertyId)
      }
    } catch {
      return null
    }
  }
  return null
}

function ownerMatchTextsEqual(a, b) {
  const left = normalizeOwnerMatchText(a)
  const right = normalizeOwnerMatchText(b)
  if (left && right && left === right) return true
  const compactLeft = compactOwnerMatchText(a)
  const compactRight = compactOwnerMatchText(b)
  return Boolean(compactLeft && compactRight && compactLeft === compactRight)
}

export function listingRelistsPurchase(listing, purchase) {
  if (!listing || listing.isPurchased || !purchase?.isPurchased) return false

  const sourceId = readListingSourcePurchasedPropertyId(listing)
  const purchaseId = toPositiveInt(purchase.id)
  if (sourceId && purchaseId && sourceId === purchaseId) return true

  const title = normalizeOwnerMatchText(listing.title)
  const purchaseTitle = normalizeOwnerMatchText(purchase.title)
  const location = normalizeOwnerMatchText(listing.location)
  const purchaseLocation = normalizeOwnerMatchText(purchase.location)
  if (GENERIC_OWNER_TITLES.has(title) || GENERIC_OWNER_TITLES.has(purchaseTitle)) return false
  if (GENERIC_OWNER_LOCATIONS.has(location) || GENERIC_OWNER_LOCATIONS.has(purchaseLocation)) return false

  return (
    ownerMatchTextsEqual(listing.title, purchase.title) &&
    ownerMatchTextsEqual(listing.location, purchase.location)
  )
}

export function mergeOwnerListWithPurchases(listingRows, purchasedRows) {
  const listings = listingRows || []
  const visiblePurchases = (purchasedRows || []).filter(
    (purchase) => !listings.some((listing) => listingRelistsPurchase(listing, purchase)),
  )
  return [...visiblePurchases, ...listings]
}
