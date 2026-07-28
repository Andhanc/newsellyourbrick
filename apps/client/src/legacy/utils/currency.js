/** Валюты объявлений (код ISO → символ для UI) */
export const PROPERTY_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Доллар США' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'GBP', symbol: '£', name: 'Фунт стерлингов' },
  { code: 'AED', symbol: 'د.إ', name: 'Дирхам ОАЭ' },
  { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
  { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль' },
]

const SYMBOL_BY_CODE = Object.fromEntries(
  PROPERTY_CURRENCIES.map((c) => [c.code, c.symbol]),
)

/** Быстрый выбор в форме добавления объекта */
export const QUICK_LISTING_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'AED']

/** Валюты в фильтре глобального каталога: евро, доллары, дирхамы */
export const CATALOG_FILTER_CURRENCY_CODES = ['EUR', 'USD', 'AED']

export function getCatalogFilterCurrencies() {
  const known = new Map(PROPERTY_CURRENCIES.map((c) => [c.code, c]))
  return CATALOG_FILTER_CURRENCY_CODES.map((code) => known.get(code)).filter(Boolean)
}

export function normalizeCurrencyCode(currency) {
  const code = String(currency || 'USD')
    .trim()
    .toUpperCase()
  return code || 'USD'
}

export function getCurrencySymbol(currency) {
  const code = normalizeCurrencyCode(currency)
  if (SYMBOL_BY_CODE[code]) return SYMBOL_BY_CODE[code]
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    const sym = parts.find((p) => p.type === 'currency')?.value
    if (sym && sym !== code) return sym
  } catch {
    /* неизвестный код — показываем код */
  }
  return `${code} `
}

/**
 * Цена с символом валюты (как на карточках и в деталях).
 * @param {number|string} amount
 * @param {string} [currency]
 * @param {{ compact?: boolean, locale?: string }} [options]
 */
export function formatPropertyPrice(amount, currency = 'USD', options = {}) {
  const { compact = false, locale = 'en-US' } = options
  const num = Number(amount)
  if (!Number.isFinite(num)) return '—'
  const sym = getCurrencySymbol(currency)
  if (compact) {
    if (num >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${sym}${Math.round(num / 1_000)}K`
  }
  return `${sym}${num.toLocaleString(locale)}`
}
