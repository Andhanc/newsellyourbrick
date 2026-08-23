/**
 * Единый ключ избранного: таблица БД + id объекта.
 * На API в source_table приходят 'apartments' | 'houses' или полные имена таблиц.
 */

export function normalizePropertyTable(raw) {
  if (raw == null || raw === '') return 'properties_apartments'
  const s = String(raw).toLowerCase()
  if (s === 'apartments' || s === 'properties_apartments') return 'properties_apartments'
  if (s === 'houses' || s === 'properties_houses') return 'properties_houses'
  if (s === 'properties') return 'properties'
  return 'properties_apartments'
}

export function favoriteCompositeKey(propertyId, sourceTable) {
  return `${normalizePropertyTable(sourceTable)}:${Number(propertyId)}`
}

/** Объект с сервера (аукцион / главная из API) — можно сохранять в БД */
export function hasDbBackedProperty(property) {
  return (
    property != null &&
    property.id != null &&
    property.source_table != null &&
    String(property.source_table).trim() !== ''
  )
}

function normalizeMockCategoryForCompare(category) {
  if (category === 'flat' || category === 'apartment') return 'kvaritra'
  return category
}

/**
 * Канонический тип недвижимости (вилла / дом / квартира).
 * Для сравнения пары больше не используется — см. normalizeSaleTypeForCompare.
 */
export function normalizePropertyTypeForCompare(property) {
  const raw = String(property?.property_type || property?.propertyType || '')
    .toLowerCase()
    .trim()

  if (raw === 'flat' || raw === 'apartment' || raw === 'apartments') return 'apartment'
  if (raw === 'villa') return 'villa'
  if (raw === 'house' || raw === 'home') return 'house'
  if (raw === 'townhouse') return 'townhouse'
  if (raw === 'commercial') return 'commercial'
  if (raw === 'land') return 'land'

  const table = normalizePropertyTable(property?.source_table)
  if (table === 'properties_houses') return 'house'
  if (table === 'properties_apartments') return 'apartment'
  return 'object'
}

/**
 * Тип продажи для сравнения: аукцион с аукционом, «купить сейчас» с «купить сейчас».
 * Аукцион + buy now относится к аукциону.
 */
export function normalizeSaleTypeForCompare(property) {
  if (!property) return 'buy_now'

  const saleType = String(property.sale_type || property.saleType || '').toLowerCase().trim()
  const isShare =
    saleType === 'share' ||
    property.is_share === 1 ||
    property.is_share === true ||
    property.is_shared_ownership === 1 ||
    property.is_shared_ownership === true ||
    property.is_shared === 1 ||
    property.is_shared === true
  if (isShare) return 'shares'

  const isDebt =
    saleType === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true
  if (isDebt) return 'debt'

  const isAuction =
    saleType === 'auction' ||
    property.isAuction === true ||
    property.is_auction === 1 ||
    property.is_auction === true ||
    property.is_auction === '1'
  if (isAuction) return 'auction'

  return 'buy_now'
}

function isAuctionListing(property) {
  if (!property) return false
  return Boolean(
    property.is_auction === 1 ||
      property.is_auction === true ||
      property.isAuction === true ||
      String(property.sale_type || property.saleType || '').toLowerCase() === 'auction' ||
      property.auction_end_date ||
      property.auction_end_time ||
      property.endTime ||
      property.test_timer_end_date ||
      property.auction_starting_price != null ||
      property.auctionStartingPrice != null,
  )
}

function hasBuyNowListing(property) {
  if (!property) return false
  const price = Number(property.price)
  return Number.isFinite(price) && price > 0
}

/** Короткая подпись формата продажи для карточек сравнения. */
export function formatCompareSaleTypeLabel(property, t) {
  const group = normalizeSaleTypeForCompare(property)
  if (group === 'shares') return t('comparePage_saleShares')
  if (group === 'debt') return t('comparePage_saleDebt')
  if (group === 'auction') {
    return hasBuyNowListing(property)
      ? t('comparePage_saleStandard')
      : t('comparePage_saleAuction')
  }
  if (group === 'buy_now') return t('comparePage_saleBuyNow')
  if (isAuctionListing(property) && hasBuyNowListing(property)) return t('comparePage_saleStandard')
  if (isAuctionListing(property)) return t('comparePage_saleAuction')
  if (hasBuyNowListing(property)) return t('comparePage_saleBuyNow')
  return t('comparePage_saleStandard')
}

/** CSS-модификатор для бейджа типа продажи. */
export function getCompareSaleTypeTone(property) {
  const group = normalizeSaleTypeForCompare(property)
  if (group === 'shares') return 'shares'
  if (group === 'debt') return 'debt'
  return 'standard'
}

/** Одинаковый формат продажи для сравнения; демо — по категории. */
export function getComparisonGroupKey(property, mockCategory) {
  if (mockCategory) return `mock:${normalizeMockCategoryForCompare(mockCategory)}`
  return `sale:${normalizeSaleTypeForCompare(property)}`
}
