import { hasBuyNowOption } from './hasBuyNowOption'

/**
 * Тип размещения объекта для UI (доли, долги, аукцион, аукцион + buy now, прямая продажа).
 * Порядок проверок согласован с админским ObjectsList / главной.
 */
export function getPropertyListingKind(property) {
  if (!property) {
    return { key: 'direct', label: 'Прямая продажа', classSuffix: 'direct' }
  }

  const isShare =
    property.is_share === 1 ||
    property.is_share === true ||
    property.sale_type === 'share' ||
    property.is_shared_ownership === 1 ||
    property.is_shared_ownership === true ||
    property.is_shared === 1 ||
    property.is_shared === true

  const isDebt =
    property.sale_type === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true

  if (isShare) {
    return { key: 'shares', label: 'Доли', classSuffix: 'shares' }
  }
  if (isDebt) {
    return { key: 'debt', label: 'Долги', classSuffix: 'debt' }
  }

  const isAuction =
    property.isAuction === true ||
    property.is_auction === 1 ||
    property.is_auction === true

  if (isAuction) {
    if (hasBuyNowOption(property)) {
      return {
        key: 'auction_buy_now',
        label: 'Аукцион + купить сейчас',
        classSuffix: 'auction-bn',
      }
    }
    return { key: 'auction', label: 'Аукцион', classSuffix: 'auction' }
  }

  return { key: 'direct', label: 'Прямая продажа', classSuffix: 'direct' }
}
