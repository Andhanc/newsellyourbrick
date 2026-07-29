import { normalizeCurrencyCode } from './currency.js'

export function parseCatalogPriceValue(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null
  const digits = String(raw).replace(/\s/g, '')
  if (!/^\d+$/.test(digits)) return null
  const n = Number(digits)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function getPropertyListingCurrency(property) {
  return normalizeCurrencyCode(
    property?.currency || property?.property_currency || property?.listing_currency || 'USD'
  )
}

/** @returns {{ valid: boolean, errorKey?: string }} */
export function validateCatalogPriceRange(minPrice, maxPrice) {
  const min = parseCatalogPriceValue(minPrice)
  const max = parseCatalogPriceValue(maxPrice)
  if (min != null && max != null && min > max) {
    return { valid: false, errorKey: 'catalogPriceRangeInvalid' }
  }
  return { valid: true }
}

export function hasCatalogPriceFilter(filters = {}) {
  return (
    parseCatalogPriceValue(filters.minPrice) != null || parseCatalogPriceValue(filters.maxPrice) != null
  )
}
