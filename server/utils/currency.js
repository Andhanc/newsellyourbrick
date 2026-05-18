const SYMBOL_BY_CODE = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  RUB: '₽',
  BYN: 'Br',
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
  return `${code} `
}
