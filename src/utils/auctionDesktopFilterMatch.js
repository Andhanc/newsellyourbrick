import { hasBuyNowOption } from './hasBuyNowOption'
import { isAuctionListingEnded, isPreAuctionPhaseActive } from './auctionReminderBounds'

export const AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS = [
  { value: 'все', labelKey: 'propertyTypeAll' },
  { value: 'квартира', labelKey: 'propertyTypeFlat' },
  { value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'вилла', labelKey: 'propertyTypeVilla' },
  { value: 'дом', labelKey: 'propertyTypeHouse' },
  { value: 'земля', labelKey: 'propertyTypeLand' },
  { value: 'коммерческая', labelKey: 'propertyTypeCommercial' },
]

export const AUCTION_DESKTOP_SALE_TYPE_ITEMS = [
  { value: 'pre_auction', labelKey: 'auctionFilterPreAuction' },
  { value: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { value: 'buy_now', labelKey: 'buyNowSectionTitle' },
  { value: 'ended', labelKey: 'auctionFilterEnded' },
]

const PROPERTY_TYPE_API_MAP = {
  квартира: ['apartment', 'flat'],
  апартаменты: ['apartment'],
  вилла: ['villa'],
  дом: ['house', 'townhouse'],
  коммерческая: ['commercial'],
}

const LAND_TITLE_KEYWORDS = ['участок', 'земл', 'land plot', 'plot of land', 'terreno', 'grundstück']

/** @param {Record<string, unknown> | null | undefined} property */
export function isLandListingProperty(property) {
  if (!property) return false
  const titleLower = String(property.title || property.name || '').toLowerCase()
  if (LAND_TITLE_KEYWORDS.some((keyword) => titleLower.includes(keyword))) return true

  const landArea = Number(property.land_area)
  const livingArea = Number(property.area ?? property.sqft ?? property.living_area)
  if (!Number.isFinite(landArea) || landArea <= 0) return false

  const type = property.property_type
  if (type !== 'house' && type !== 'villa') return false
  if (!Number.isFinite(livingArea) || livingArea <= 0) return true
  return landArea >= livingArea * 1.5
}

/** @param {Record<string, unknown> | null | undefined} property @param {string} propertyType */
export function matchesAuctionPropertyTypeFilter(property, propertyType) {
  if (!property || propertyType === 'все') return true

  if (propertyType === 'земля') {
    return isLandListingProperty(property)
  }

  if (property.property_type) {
    const allowed = PROPERTY_TYPE_API_MAP[propertyType]
    if (allowed) return allowed.includes(property.property_type)
    return false
  }

  const titleLower = String(property.title || property.name || '').toLowerCase()
  const titleMatch = {
    квартира: titleLower.includes('квартир') || titleLower.includes('студи'),
    апартаменты: titleLower.includes('апартамент'),
    вилла: titleLower.includes('вилл'),
    дом: titleLower.includes('дом') || titleLower.includes('таунхаус'),
    коммерческая:
      titleLower.includes('коммер') ||
      titleLower.includes('офис') ||
      titleLower.includes('склад') ||
      titleLower.includes('commercial'),
    земля: LAND_TITLE_KEYWORDS.some((keyword) => titleLower.includes(keyword)),
  }
  return Boolean(titleMatch[propertyType])
}

/** @param {Record<string, unknown> | null | undefined} property @param {string} saleFilter @param {(p: unknown) => boolean} [isAuctionEnded] */
export function matchesAuctionSaleTypeFilter(property, saleFilter, isAuctionEnded = isAuctionListingEnded) {
  if (!property || saleFilter === 'all') return true

  const hasBuyNowPrice = hasBuyNowOption(property)

  if (saleFilter === 'pre_auction') {
    return property.isAuction === true && !isAuctionEnded(property) && isPreAuctionPhaseActive(property)
  }
  if (saleFilter === 'auction') {
    return property.isAuction === true
  }
  if (saleFilter === 'buy_now') {
    return hasBuyNowPrice
  }
  if (saleFilter === 'ended') {
    return isAuctionEnded(property)
  }
  return true
}

/** @param {Record<string, unknown> | null | undefined} property @param {string[]} propertyTypes */
export function matchesAuctionPropertyTypesFilter(property, propertyTypes) {
  if (!property || !propertyTypes?.length) return true
  return propertyTypes.some((type) => matchesAuctionPropertyTypeFilter(property, type))
}

/** @param {Record<string, unknown> | null | undefined} property @param {string[]} saleFilters @param {(p: unknown) => boolean} [isAuctionEnded] */
export function matchesAuctionSaleTypesFilter(property, saleFilters, isAuctionEnded = isAuctionListingEnded) {
  if (!property || !saleFilters?.length) return true
  return saleFilters.some((filter) => matchesAuctionSaleTypeFilter(property, filter, isAuctionEnded))
}
