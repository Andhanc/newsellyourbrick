import { getApiBaseUrl } from './apiConfig'
import { saveOapDraftPayload, clearOapDraft, getOapDraftKey } from './oapAddPropertyDraft'
import { appendViewerUserIdToPropertyApiUrl } from './propertyDetailUrl'

export const PENDING_SELL_PROPERTY_KEY = 'pendingSellPurchasedProperty'
export const PURCHASED_LISTING_DRAFT_FLAG = 'purchasedSource'

const BACKEND_TO_OAP_TYPE = {
  apartment: 'apartment',
  apartments: 'apartments',
  house: 'house',
  villa: 'villa',
  commercial: 'commercial',
  land: 'land',
}

function pickString(...values) {
  for (const value of values) {
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function pickNumberString(...values) {
  for (const value of values) {
    if (value === '' || value == null) continue
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return String(Math.round(n))
  }
  return ''
}

export function mapBackendPropertyTypeToOap(propertyType) {
  const key = String(propertyType || '').toLowerCase()
  return BACKEND_TO_OAP_TYPE[key] || 'apartment'
}

export function buildPhotosFromProperty(property) {
  const raw =
    property?.images ||
    (property?.image ? [property.image] : []) ||
    (Array.isArray(property?.photos) ? property.photos : [])
  const urls = (Array.isArray(raw) ? raw : [])
    .map((item) => (typeof item === 'string' ? item : item?.url || item?.src || ''))
    .filter(Boolean)
  return urls.slice(0, 10).map((url, index) => ({
    id: `purchased-photo-${index}-${Date.now()}`,
    preview: url,
    fromPurchased: true,
  }))
}

export function buildOapFormFromPurchasedProperty(property) {
  const type = mapBackendPropertyTypeToOap(property?.property_type)
  const params = property?.parameters || property?.tz_parameters || {}

  return {
    title: pickString(property?.title, property?.name),
    propertyType: type,
    price: '',
    location: pickString(property?.location, property?.address),
    country: pickString(property?.country),
    city: pickString(property?.city, property?.region),
    address: pickString(property?.address, property?.location),
    apartment: pickString(property?.apartment),
    cadastralNumber: pickString(property?.cadastral_number, property?.cadastralNumber),
    coordinates: property?.coordinates || property?.coords || null,
    area: pickNumberString(property?.area, property?.sqft, property?.living_area, params?.total_area_m2),
    livingArea: pickNumberString(property?.living_area, params?.living_area_m2),
    landArea: pickNumberString(property?.land_area, params?.plot_area_m2, params?.plot_area),
    rooms: pickNumberString(property?.rooms, property?.beds),
    bedrooms: pickNumberString(property?.bedrooms, property?.beds, property?.rooms),
    bathrooms: pickNumberString(property?.bathrooms, property?.baths),
    floor: pickNumberString(property?.floor, params?.floor),
    totalFloors: pickNumberString(property?.total_floors, params?.total_floors),
    yearBuilt: pickNumberString(property?.year_built, params?.year_built),
    buildingType: pickString(property?.building_type, params?.building_type),
    constructionType: pickString(property?.construction_type, params?.construction_type),
    commercialType: pickString(property?.commercial_type, params?.commercial_subtype),
    description: pickString(property?.description),
    additionalAmenities: pickString(property?.additional_amenities, property?.additionalAmenities),
    testDrive: '',
    testDrivePricePerDay: '',
    testDriveInsuranceDeposit: '',
    testDriveCurrency: 'EUR',
    listingMode: '',
    minimumSalePrice: '',
    debtAmount: '',
    totalShares: '',
    listingCurrency: String(property?.currency || 'EUR').toUpperCase().slice(0, 3) || 'EUR',
    calculatorApplied: false,
    pricingFieldSource: {},
    auctionStartingPrice: '',
    auctionStartDate: '',
    auctionEndDate: '',
  }
}

export function parseAmenitiesFromProperty(property) {
  const raw = property?.amenities || property?.tz_amenities_json
  if (Array.isArray(raw)) return [...new Set(raw.filter(Boolean))]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? [...new Set(parsed.filter(Boolean))] : []
    } catch {
      return []
    }
  }
  return []
}

export function storePendingSellPurchasedProperty(snapshot) {
  if (!snapshot?.id) return
  try {
    sessionStorage.setItem(
      PENDING_SELL_PROPERTY_KEY,
      JSON.stringify({
        id: snapshot.id,
        title: snapshot.title || snapshot.name || '',
        image: snapshot.image || snapshot.images?.[0] || '',
        savedAt: Date.now(),
      }),
    )
  } catch {
    // ignore
  }
}

export function readPendingSellPurchasedProperty() {
  try {
    const raw = sessionStorage.getItem(PENDING_SELL_PROPERTY_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearPendingSellPurchasedProperty() {
  try {
    sessionStorage.removeItem(PENDING_SELL_PROPERTY_KEY)
  } catch {
    // ignore
  }
}

export async function fetchPropertySnapshot(propertyId, lang = 'ru') {
  const base = await getApiBaseUrl()
  const url = appendViewerUserIdToPropertyApiUrl(`${base}/properties/${propertyId}?lang=${lang}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error('property_fetch_failed')
  const json = await res.json()
  if (!json?.success || !json?.data) throw new Error('property_not_found')
  return json.data
}

export async function applyPurchasedPropertyListingPrefill(propertyOrId, { lang = 'ru' } = {}) {
  const propertyId =
    typeof propertyOrId === 'object' && propertyOrId != null
      ? propertyOrId.id
      : propertyOrId

  if (!propertyId) return null

  const property = await fetchPropertySnapshot(propertyId, lang)

  const form = buildOapFormFromPurchasedProperty(property)
  const photos = buildPhotosFromProperty(property)
  const selectedAmenities = parseAmenitiesFromProperty(property)

  const draft = {
    savedAt: Date.now(),
    version: 1,
    form,
    step: 2,
    photos,
    videos: [],
    requiredDocuments: { ownership: null, noDebts: null },
    additionalDocuments: [],
    selectedAmenities,
    [PURCHASED_LISTING_DRAFT_FLAG]: {
      propertyId,
      title: form.title || pickString(property?.title, property?.name),
      image: photos[0]?.preview || '',
      createdAt: Date.now(),
    },
  }

  clearOapDraft(getOapDraftKey())
  saveOapDraftPayload(draft, getOapDraftKey())
  clearPendingSellPurchasedProperty()

  return { property, draft }
}

export function getPurchasedListingDraftMeta() {
  try {
    const raw = localStorage.getItem(getOapDraftKey())
    if (!raw) return null
    const draft = JSON.parse(raw)
    return draft?.[PURCHASED_LISTING_DRAFT_FLAG] || null
  } catch {
    return null
  }
}

export function buildPurchasedPropertySnapshot(property) {
  if (!property?.id) return null
  const images = buildPhotosFromProperty(property)
  return {
    id: property.id,
    title: pickString(property.title, property.name),
    name: pickString(property.name, property.title),
    image: images[0]?.preview || '',
    location: pickString(property.location, property.address),
    property_type: property.property_type,
  }
}
