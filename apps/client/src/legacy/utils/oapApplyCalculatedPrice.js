import {
  createCalculatorPricingSources,
  deriveAuctionPricesFromMarketValue,
} from './oapAuctionPriceAuto'

/**
 * Подстановка сумм из рекомендованной цены калькулятора (как в AddProperty).
 * От рекомендации: −15% → «Продать сейчас»; от неё −10% → минимум; старт ≤30% от «Продать сейчас».
 */
export function applyCalculatedPriceToForm(form, recommendedPrice) {
  const derived = deriveAuctionPricesFromMarketValue(recommendedPrice)
  if (!derived) return form

  const mode = form.listingMode || 'auction'

  if (mode === 'shares') {
    const rec = Math.max(0, Math.round(Number(recommendedPrice) || 0))
    return { ...form, price: String(rec), calculatorApplied: true }
  }

  if (mode === 'debt') {
    const rec = Math.max(0, Math.round(Number(recommendedPrice) || 0))
    return { ...form, debtAmount: String(rec), calculatorApplied: true }
  }

  if (mode === 'auction_buy_now' || mode === 'debt_auction') {
    return {
      ...form,
      price: derived.price,
      minimumSalePrice: derived.minimumSalePrice,
      auctionStartingPrice: derived.auctionStartingPrice,
      calculatorApplied: true,
      pricingFieldSource: createCalculatorPricingSources(mode),
    }
  }

  if (mode === 'auction') {
    return {
      ...form,
      minimumSalePrice: derived.minimumSalePrice,
      auctionStartingPrice: derived.auctionStartingPrice,
      calculatorApplied: true,
      pricingFieldSource: createCalculatorPricingSources(mode),
    }
  }

  const next = {
    ...form,
    auctionStartingPrice: derived.auctionStartingPrice,
    calculatorApplied: true,
    pricingFieldSource: createCalculatorPricingSources(mode),
  }
  if (!form.price || Number(String(form.price).replace(/\s/g, '')) <= 0) {
    next.price = derived.price
  }
  return next
}
