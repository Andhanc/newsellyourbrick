import { getPropertyListingKind } from './propertyListingKind'
import { hasBuyNowOption } from './hasBuyNowOption'
import {
  getPropertyListPrice,
  propertyMatchesLocationFilter,
} from './propertySearchLocation'

const PROPERTY_TYPE_SEARCH_MAP = {
  Квартира: ['apartment'],
  Апартаменты: ['commercial'],
  Вилла: ['villa'],
  Дом: ['house'],
  Таунхаус: ['house'],
}

export function getSearchLocationCriteria(filters = {}) {
  return {
    country: filters.country || '',
    region: filters.region || '',
  }
}

function hasFilterValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function passesSearchLocationFilter(prop, filters = {}) {
  const { country, region } = getSearchLocationCriteria(filters)
  if (!country && !region) return true
  return propertyMatchesLocationFilter(prop, { country, region })
}

function passesPropertyTypeFilter(prop, propertyType) {
  const targetTypes = PROPERTY_TYPE_SEARCH_MAP[propertyType] || []
  if (!targetTypes.length) return false
  return targetTypes.includes(prop.property_type)
}

function passesPurchaseTypeFilter(prop, purchaseType) {
  const kind = getPropertyListingKind(prop).key
  switch (purchaseType) {
    case 'auction':
      return kind === 'auction' || kind === 'auction_buy_now'
    case 'buy_now':
      return hasBuyNowOption(prop)
    case 'shares':
      return kind === 'shares'
    case 'debt':
      return kind === 'debt'
    case 'direct':
      return kind === 'direct'
    default:
      return false
  }
}

/** Точное совпадение комнат; значение «5» в подборке = опция «5+» */
function passesRoomsFilter(prop, roomsFilter) {
  const propRooms = Number(prop.rooms ?? prop.bedrooms ?? 0)
  if (!Number.isFinite(propRooms)) return false

  if (String(roomsFilter) === '5') {
    return propRooms >= 5
  }

  const rooms = parseInt(roomsFilter, 10)
  if (!Number.isFinite(rooms)) return false
  return propRooms === rooms
}

/** Не считаем фильтром полный диапазон ползунка (min–max сайта) */
export function normalizeSearchPriceFilters(filters = {}, priceBounds = null) {
  const out = { ...filters }
  if (!priceBounds) return out

  const min = hasFilterValue(out.minPrice) ? parseFloat(out.minPrice) : null
  const max = hasFilterValue(out.maxPrice) ? parseFloat(out.maxPrice) : null
  const boundMin = Number(priceBounds.min)
  const boundMax = Number(priceBounds.max)

  if (
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    Number.isFinite(boundMin) &&
    Number.isFinite(boundMax) &&
    min <= boundMin &&
    max >= boundMax
  ) {
    out.minPrice = ''
    out.maxPrice = ''
  }

  return out
}

function passesPriceFilter(prop, filters = {}) {
  const price = getPropertyListPrice(prop)
  if (hasFilterValue(filters.minPrice)) {
    const minPrice = parseFloat(filters.minPrice)
    if (!Number.isFinite(minPrice) || price < minPrice) return false
  }
  if (hasFilterValue(filters.maxPrice)) {
    const maxPrice = parseFloat(filters.maxPrice)
    if (!Number.isFinite(maxPrice) || price > maxPrice) return false
  }
  return true
}

function passesAreaFilter(prop, filters = {}) {
  const area = Number(prop.area ?? prop.sqft ?? 0)
  if (hasFilterValue(filters.minArea)) {
    const minArea = parseFloat(filters.minArea)
    if (!Number.isFinite(minArea) || area < minArea) return false
  }
  if (hasFilterValue(filters.maxArea)) {
    const maxArea = parseFloat(filters.maxArea)
    if (!Number.isFinite(maxArea) || area > maxArea) return false
  }
  return true
}

/**
 * Поиск без погрешностей, каскадом (каждый шаг сужает выборку):
 * 1) адрес (страна / регион)
 * 2) комнаты (точное совпадение)
 * 3) цена (строго в min–max, если заданы)
 * 4) тип недвижимости
 * 5) тип покупки
 * 6) площадь (строго в min–max, если задана)
 *
 * Пустой критерий в подборке не участвует в фильтрации.
 */
export function filterPropertiesStrict(properties = [], filters = {}) {
  let result = properties

  if (hasFilterValue(filters.country) || hasFilterValue(filters.region)) {
    result = result.filter((p) => passesSearchLocationFilter(p, filters))
  }

  if (hasFilterValue(filters.rooms)) {
    result = result.filter((p) => passesRoomsFilter(p, filters.rooms))
  }

  if (hasFilterValue(filters.minPrice) || hasFilterValue(filters.maxPrice)) {
    result = result.filter((p) => passesPriceFilter(p, filters))
  }

  if (hasFilterValue(filters.propertyType)) {
    result = result.filter((p) => passesPropertyTypeFilter(p, filters.propertyType))
  }

  if (hasFilterValue(filters.purchaseType)) {
    result = result.filter((p) => passesPurchaseTypeFilter(p, filters.purchaseType))
  }

  if (hasFilterValue(filters.minArea) || hasFilterValue(filters.maxArea)) {
    result = result.filter((p) => passesAreaFilter(p, filters))
  }

  return result
}
