function firstPositiveMajor(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** Аукционный минимум: явное поле minimum_sale_price, иначе fallback на price (старые объявления). */
export function computeMinimumSalePriceMajor(property) {
  return firstPositiveMajor(property?.minimum_sale_price, property?.price);
}

/**
 * База для резерва 10% при «Купить сейчас»: цена buy now (`price`),
 * а не аукционный minimum_sale_price — иначе Stripe берёт другую сумму, чем модалка.
 */
export function computeBuyNowSalePriceMajor(property) {
  return firstPositiveMajor(property?.price, property?.minimum_sale_price);
}

export function computeReservationSalePriceMajor(property, purchaseVariant = 'buyNow') {
  if (purchaseVariant === 'auctionWinner') {
    return computeMinimumSalePriceMajor(property);
  }
  return computeBuyNowSalePriceMajor(property);
}
