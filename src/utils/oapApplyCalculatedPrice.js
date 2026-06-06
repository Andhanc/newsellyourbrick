/**
 * Подстановка сумм из рекомендованной цены калькулятора (как в AddProperty).
 * От рекомендации: −15% → «Продать сейчас»; от неё −10% → минимум; старт ≤30% от «Продать сейчас».
 */
export function applyCalculatedPriceToForm(form, recommendedPrice) {
  const rec = Math.max(0, Math.round(Number(recommendedPrice) || 0))
  if (!rec) return form

  const buyNowFromRec = Math.round(rec * 0.85)
  const minSaleFromRec = Math.round(buyNowFromRec * 0.9)
  const startingFromRec = Math.round(buyNowFromRec * 0.3)
  const mode = form.listingMode || 'auction'

  if (mode === 'shares') {
    return { ...form, price: String(rec), calculatorApplied: true }
  }

  if (mode === 'debt') {
    return { ...form, debtAmount: String(rec), calculatorApplied: true }
  }

  if (mode === 'auction_buy_now' || mode === 'debt_auction') {
    return {
      ...form,
      price: String(buyNowFromRec),
      minimumSalePrice: String(minSaleFromRec),
      auctionStartingPrice: String(startingFromRec),
      calculatorApplied: true,
    }
  }

  if (mode === 'auction') {
    return {
      ...form,
      minimumSalePrice: String(minSaleFromRec),
      auctionStartingPrice: String(startingFromRec),
      calculatorApplied: true,
    }
  }

  const next = {
    ...form,
    auctionStartingPrice: String(startingFromRec),
    calculatorApplied: true,
  }
  if (!form.price || Number(String(form.price).replace(/\s/g, '')) <= 0) {
    next.price = String(buyNowFromRec || rec)
  }
  return next
}
