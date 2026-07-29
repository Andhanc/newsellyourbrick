import { parseMoneyDigits } from './oapPricingValidation'

export const PRICING_SOURCE_MANUAL = 'manual'
export const PRICING_SOURCE_BUY_NOW = 'buy_now'
export const PRICING_SOURCE_CALCULATOR = 'calculator'
export const PRICING_SOURCE_MINIMUM_SALE = 'minimum_sale'

export const BUY_NOW_AUCTION_MODES = new Set(['auction_buy_now', 'debt_auction'])

/** От «Продать сейчас»: минимум 90%, старт 30%. */
export function deriveAuctionPricesFromBuyNow(buyNowRaw) {
  const buyNow = Math.max(0, Math.round(parseMoneyDigits(buyNowRaw) || 0))
  if (!buyNow) return null
  return {
    minimumSalePrice: String(Math.round(buyNow * 0.9)),
    auctionStartingPrice: String(Math.round(buyNow * 0.3)),
  }
}

/** От рыночной оценки: −15% → buy now; далее как от buy now. */
export function deriveAuctionPricesFromMarketValue(recRaw) {
  const rec = Math.max(0, Math.round(parseMoneyDigits(recRaw) || 0))
  if (!rec) return null
  const buyNow = Math.round(rec * 0.85)
  return {
    price: String(buyNow),
    minimumSalePrice: String(Math.round(buyNow * 0.9)),
    auctionStartingPrice: String(Math.round(buyNow * 0.3)),
  }
}

/** Только аукцион без buy now: старт ≈ ⅓ от минимальной цены. */
export function deriveStartingFromMinimumSale(minRaw) {
  const min = Math.max(0, Math.round(parseMoneyDigits(minRaw) || 0))
  if (!min) return null
  return { auctionStartingPrice: String(Math.round(min / 3)) }
}

export function createCalculatorPricingSources(listingMode) {
  const sources = {
    minimumSalePrice: PRICING_SOURCE_CALCULATOR,
    auctionStartingPrice: PRICING_SOURCE_CALCULATOR,
  }
  if (BUY_NOW_AUCTION_MODES.has(listingMode)) {
    sources.price = PRICING_SOURCE_CALCULATOR
  }
  return sources
}

export function isPricingFieldAuto(sources, fieldKey) {
  const source = sources?.[fieldKey]
  return Boolean(source && source !== PRICING_SOURCE_MANUAL)
}

export function applyPricingFieldChange(prevForm, key, value) {
  const mode = prevForm.listingMode || 'auction'
  const sources = { ...(prevForm.pricingFieldSource || {}) }
  let next = { ...prevForm, [key]: value }

  if (key === 'auctionStartingPrice') {
    sources.auctionStartingPrice = PRICING_SOURCE_MANUAL
  } else if (key === 'minimumSalePrice') {
    sources.minimumSalePrice = PRICING_SOURCE_MANUAL
    if (mode === 'auction') {
      const derived = deriveStartingFromMinimumSale(value)
      if (derived && sources.auctionStartingPrice !== PRICING_SOURCE_MANUAL) {
        next.auctionStartingPrice = derived.auctionStartingPrice
        sources.auctionStartingPrice = PRICING_SOURCE_MINIMUM_SALE
      }
    }
  } else if (key === 'price' && BUY_NOW_AUCTION_MODES.has(mode)) {
    const derived = deriveAuctionPricesFromBuyNow(value)
    if (derived) {
      if (sources.minimumSalePrice !== PRICING_SOURCE_MANUAL) {
        next.minimumSalePrice = derived.minimumSalePrice
        sources.minimumSalePrice = PRICING_SOURCE_BUY_NOW
      }
      if (sources.auctionStartingPrice !== PRICING_SOURCE_MANUAL) {
        next.auctionStartingPrice = derived.auctionStartingPrice
        sources.auctionStartingPrice = PRICING_SOURCE_BUY_NOW
      }
    }
  }

  next.pricingFieldSource = sources
  return next
}
