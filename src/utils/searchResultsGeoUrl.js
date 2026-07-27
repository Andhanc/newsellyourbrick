import { getPropertySlugFromRecord } from './propertySlug'
import { getPropertyDetailPath } from './propertyDetailUrl'
import { countryLabelToUrlSlug, cityLabelToUrlSlug } from './catalogGeoUrl'
import { getCanonicalRegionKey, matchCountryKey } from './propertySearchLocation'

export function getSearchResultsGeoPath({ country, region } = {}) {
  const countrySlug = countryLabelToUrlSlug(country)
  const regionSlug = cityLabelToUrlSlug(region)
  if (!countrySlug || !regionSlug) return '/search-results'
  return `/search-results/${countrySlug}/${regionSlug}`
}

export function getSearchResultsPropertyPath(property, geo = {}) {
  const basePath = getSearchResultsGeoPath(geo)
  if (!property || property.id == null) return basePath

  const slug = getPropertySlugFromRecord(property)
  const segment = slug || String(property.id)
  if (basePath === '/search-results') {
    return getPropertyDetailPath(property)
  }
  return `${basePath}/property/${segment}`
}

export function parseSearchResultsGeoRoute({ country, city } = {}) {
  const countryKey = matchCountryKey(country) || String(country || '').trim().toLowerCase()
  const regionKey = getCanonicalRegionKey(city || '')
  return {
    country: countryKey,
    region: regionKey,
  }
}

