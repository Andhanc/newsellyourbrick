function parseMoneyDigits(value) {
  const cleaned = String(value ?? '').replace(/\s/g, '').replace(/,/g, '')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

export const PRICING_SOURCE_MANUAL = 'manual'
export const PRICING_SOURCE_BUY_NOW = 'buy_now'
export const PRICING_SOURCE_CALCULATOR = 'calculator'
export const PRICING_SOURCE_MINIMUM_SALE = 'minimum_sale'

export const BUY_NOW_AUCTION_MODES = new Set(['auction_buy_now', 'debt_auction'])

const MIN_SHARE = 0.9
const START_SHARE = 0.3

/** От «Продать сейчас»: минимум 90%, старт 30%. */
export function deriveAuctionPricesFromBuyNow(buyNowRaw) {
  const buyNow = Math.max(0, Math.round(parseMoneyDigits(buyNowRaw) || 0))
  if (!buyNow) return null
  return {
    minimumSalePrice: String(Math.round(buyNow * MIN_SHARE)),
    auctionStartingPrice: String(Math.round(buyNow * START_SHARE)),
  }
}

/** От рыночной оценки: −15% → buy now; далее как от buy now. */
export function deriveAuctionPricesFromMarketValue(recRaw) {
  const rec = Math.max(0, Math.round(parseMoneyDigits(recRaw) || 0))
  if (!rec) return null
  const buyNow = Math.round(rec * 0.85)
  return {
    price: String(buyNow),
    minimumSalePrice: String(Math.round(buyNow * MIN_SHARE)),
    auctionStartingPrice: String(Math.round(buyNow * START_SHARE)),
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

function roundMoney(value) {
  const n = parseMoneyDigits(value)
  if (n == null) return null
  return Math.max(0, Math.round(n))
}

function sameMoney(raw, expected) {
  const left = roundMoney(raw)
  const right = roundMoney(expected)
  return left != null && right != null && left === right
}

/** Пустое поле остаётся пустым, чтобы сумму можно было стереть и ввести заново. */
function clampMoneyToMax(raw, max) {
  if (raw == null || String(raw).trim() === '') return ''
  const amount = roundMoney(raw)
  if (amount == null) return ''
  if (max == null || !Number.isFinite(max)) return String(amount)
  return String(Math.min(amount, Math.max(0, Math.round(max))))
}

function clearAutoField(next, sources, fieldKey) {
  if (sources[fieldKey] === PRICING_SOURCE_MANUAL) return
  next[fieldKey] = ''
  delete sources[fieldKey]
}

/**
 * Потолок для уже введённой суммы. Если после ограничения она снова совпала
 * с автоматической, поле опять следует за якорем.
 */
function clampManualOrMatch(next, sources, fieldKey, cap, autoValue, autoSource) {
  if (next[fieldKey] == null || String(next[fieldKey]).trim() === '') return
  const clamped = clampMoneyToMax(next[fieldKey], cap)
  next[fieldKey] = clamped
  if (sameMoney(clamped, autoValue)) sources[fieldKey] = autoSource
}

function enforceBuyNowCaps(next, sources, { replaceAuto }) {
  const derived = deriveAuctionPricesFromBuyNow(next.price)
  if (!derived) {
    if (replaceAuto) {
      clearAutoField(next, sources, 'minimumSalePrice')
      clearAutoField(next, sources, 'auctionStartingPrice')
    }
    return
  }

  const minCap = Number(derived.minimumSalePrice)
  const startCap = Number(derived.auctionStartingPrice)

  if (replaceAuto && sources.minimumSalePrice !== PRICING_SOURCE_MANUAL) {
    next.minimumSalePrice = derived.minimumSalePrice
    sources.minimumSalePrice = PRICING_SOURCE_BUY_NOW
  } else {
    clampManualOrMatch(
      next,
      sources,
      'minimumSalePrice',
      minCap,
      derived.minimumSalePrice,
      PRICING_SOURCE_BUY_NOW,
    )
  }

  const minimumNow = roundMoney(next.minimumSalePrice)
  const startLimit = minimumNow == null ? startCap : Math.min(startCap, minimumNow)
  const autoStart = String(Math.round(Math.min(startCap, minimumNow ?? startCap)))

  if (replaceAuto && sources.auctionStartingPrice !== PRICING_SOURCE_MANUAL) {
    next.auctionStartingPrice = autoStart
    sources.auctionStartingPrice =
      sameMoney(autoStart, derived.auctionStartingPrice)
        ? PRICING_SOURCE_BUY_NOW
        : PRICING_SOURCE_MINIMUM_SALE
  } else {
    clampManualOrMatch(
      next,
      sources,
      'auctionStartingPrice',
      startLimit,
      autoStart,
      sameMoney(autoStart, derived.auctionStartingPrice)
        ? PRICING_SOURCE_BUY_NOW
        : PRICING_SOURCE_MINIMUM_SALE,
    )
  }
}

function enforceAuctionOnlyStart(next, sources, { replaceAuto }) {
  const derived = deriveStartingFromMinimumSale(next.minimumSalePrice)
  if (!derived) {
    if (replaceAuto) clearAutoField(next, sources, 'auctionStartingPrice')
    return
  }
  const cap = Number(derived.auctionStartingPrice)
  if (replaceAuto && sources.auctionStartingPrice !== PRICING_SOURCE_MANUAL) {
    next.auctionStartingPrice = derived.auctionStartingPrice
    sources.auctionStartingPrice = PRICING_SOURCE_MINIMUM_SALE
    return
  }
  clampManualOrMatch(
    next,
    sources,
    'auctionStartingPrice',
    cap,
    derived.auctionStartingPrice,
    PRICING_SOURCE_MINIMUM_SALE,
  )
}

export function applyPricingFieldChange(prevForm, key, value) {
  const mode = prevForm.listingMode || 'auction'
  const sources = { ...(prevForm.pricingFieldSource || {}) }
  const next = { ...prevForm, [key]: value }
  const buyNowMode = BUY_NOW_AUCTION_MODES.has(mode)

  if (key === 'auctionStartingPrice') {
    sources.auctionStartingPrice = PRICING_SOURCE_MANUAL
    if (buyNowMode) enforceBuyNowCaps(next, sources, { replaceAuto: false })
    else if (mode === 'auction') enforceAuctionOnlyStart(next, sources, { replaceAuto: false })
  } else if (key === 'minimumSalePrice') {
    sources.minimumSalePrice = PRICING_SOURCE_MANUAL
    if (buyNowMode) enforceBuyNowCaps(next, sources, { replaceAuto: false })
    else if (mode === 'auction') enforceAuctionOnlyStart(next, sources, { replaceAuto: true })
  } else if (key === 'price' && buyNowMode) {
    enforceBuyNowCaps(next, sources, { replaceAuto: true })
  }

  next.pricingFieldSource = sources
  return next
}
