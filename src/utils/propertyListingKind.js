import { hasBuyNowOption } from './hasBuyNowOption'

const KIND_LABEL_KEYS = {
  direct: 'listingKind_direct',
  shares: 'listingKind_shares',
  debt: 'listingKind_debt',
  auction: 'listingKind_auction',
  auction_buy_now: 'listingKind_auctionBuyNow',
}

/**
 * Listing kind for UI (shares, debts, auction, auction + buy now, direct).
 * Order matches admin ObjectsList / home.
 */
export function getPropertyListingKind(property) {
  if (!property) {
    return {
      key: 'direct',
      labelKey: KIND_LABEL_KEYS.direct,
      label: KIND_LABEL_KEYS.direct,
      classSuffix: 'direct',
    }
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
    return {
      key: 'shares',
      labelKey: KIND_LABEL_KEYS.shares,
      label: KIND_LABEL_KEYS.shares,
      classSuffix: 'shares',
    }
  }
  if (isDebt) {
    return {
      key: 'debt',
      labelKey: KIND_LABEL_KEYS.debt,
      label: KIND_LABEL_KEYS.debt,
      classSuffix: 'debt',
    }
  }

  const isAuction =
    property.isAuction === true ||
    property.is_auction === 1 ||
    property.is_auction === true

  if (isAuction) {
    if (hasBuyNowOption(property)) {
      return {
        key: 'auction_buy_now',
        labelKey: KIND_LABEL_KEYS.auction_buy_now,
        label: KIND_LABEL_KEYS.auction_buy_now,
        classSuffix: 'auction-bn',
      }
    }
    return {
      key: 'auction',
      labelKey: KIND_LABEL_KEYS.auction,
      label: KIND_LABEL_KEYS.auction,
      classSuffix: 'auction',
    }
  }

  return {
    key: 'direct',
    labelKey: KIND_LABEL_KEYS.direct,
    label: KIND_LABEL_KEYS.direct,
    classSuffix: 'direct',
  }
}

export function getPropertyListingKindLabel(kind, t) {
  const key = kind?.labelKey || kind?.label || KIND_LABEL_KEYS.direct
  return typeof t === 'function' ? t(key) : key
}
