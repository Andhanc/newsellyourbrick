import {
  matchCountryKey,
  getCanonicalRegionKey,
  getCanonicalRegionLabel,
  getCountryLabel,
} from './propertySearchLocation.js'
import { slugifyLatin } from './propertySlug.js'

const CATALOG_TYPE_I18N = {
  apartments: 'oap_propertyTypeApartments',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
}

const PROPERTY_TYPE_TO_PLURAL = {
  apartment: 'apartments',
  flat: 'apartments',
  apartments: 'apartments',
  villa: 'villas',
  house: 'houses',
  townhouse: 'houses',
  commercial: 'commercial',
}

export const CATALOG_TYPE_PLURALS = {
  apartments: ['apartment', 'commercial'],
  villas: ['villa'],
  houses: ['house'],
  commercial: ['commercial'],
}

export const CATALOG_SALE_TABS = ['all', 'auction', 'co-investment', 'debts']

const RESERVED_TOP_SEGMENTS = new Set([
  'property',
  'shares',
  'co-investment',
  'debts',
  'auction',
  'about',
  'news',
  'map',
  'chat',
  'admin',
  'profile',
  'owner',
  'sections',
  'calculator',
  'favorites',
  'compare',
  'wallet',
  'deposit',
  'main',
  'test',
  'jeton',
  'oauth-bridge',
  'auth',
  'test-drive',
  'marketer',
  'bonuses',
  'subscriptions',
  'history',
  'private-club',
  'search-results',
  'data',
])

export function countryLabelToUrlSlug(country) {
  const key = matchCountryKey(country || '')
  if (key) return key
  return slugifyLatin(country) || ''
}

export function cityLabelToUrlSlug(city) {
  const key = getCanonicalRegionKey(city || '')
  return slugifyLatin(key || city) || ''
}

export function isCatalogCountrySegment(segment) {
  const s = String(segment || '').trim().toLowerCase()
  if (!s || RESERVED_TOP_SEGMENTS.has(s)) return false
  return Boolean(matchCountryKey(s))
}

export function buildCatalogCityPath({ country, city, typePlural, sale } = {}) {
  const countrySlug = countryLabelToUrlSlug(country)
  const citySlug = cityLabelToUrlSlug(city)
  if (!countrySlug || !citySlug) return null

  let path = `/${countrySlug}/${citySlug}`
  if (typePlural && CATALOG_TYPE_PLURALS[typePlural]) {
    path += `/${typePlural}`
  }

  const params = new URLSearchParams()
  if (sale && sale !== 'all') params.set('sale', sale)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export function parseCatalogRouteParams({ country, city, typePlural }) {
  return {
    country: String(country || '').toLowerCase(),
    city: String(city || '').toLowerCase(),
    typePlural: typePlural ? String(typePlural).toLowerCase() : null,
  }
}

export function resolvePropertyGeoFields(property) {
  let country = property?.country
  let city = property?.city
  if ((!country || !city) && property?.location) {
    const parts = String(property.location)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!country && parts[0]) country = parts[0]
    if (!city && parts[1]) city = parts[1]
  }
  return { country, city }
}

export function propertyTypeToCatalogPlural(propertyType) {
  const pt = String(propertyType || '').toLowerCase()
  return PROPERTY_TYPE_TO_PLURAL[pt] || null
}

/**
 * @param {object} property
 * @param {(key: string) => string} t
 * @returns {{ to: string, label: string }[]}
 */
export function buildPropertyGeoBreadcrumbItems(property, t) {
  const { country, city } = resolvePropertyGeoFields(property)
  const countrySlug = countryLabelToUrlSlug(country)
  const citySlug = cityLabelToUrlSlug(city)
  if (!countrySlug || !citySlug) return []

  const cityLabel = getCanonicalRegionLabel(citySlug, city)
  const countryKey = matchCountryKey(country) || countrySlug
  const countryLabel = getCountryLabel(countryKey, country)

  /** @type {{ to: string, label: string }[]} */
  const items = [
    { to: `/${countrySlug}/${citySlug}`, label: countryLabel },
    { to: `/${countrySlug}/${citySlug}`, label: cityLabel },
  ]

  const typePlural = propertyTypeToCatalogPlural(property?.property_type)
  if (typePlural && CATALOG_TYPE_PLURALS[typePlural]) {
    const key = CATALOG_TYPE_I18N[typePlural]
    items.push({
      to: `/${countrySlug}/${citySlug}/${typePlural}`,
      label: key ? t(key) : typePlural,
    })
  }
  return items
}
