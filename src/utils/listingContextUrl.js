import { getPropertyDetailPath } from './propertyDetailUrl'
import { getCoInvestmentDetailPath } from './sectionRoutes'
import { countryLabelToUrlSlug, cityLabelToUrlSlug } from './catalogGeoUrl'
import { getPropertySlugFromRecord } from './propertySlug'

export function hasListingGeoContext(country, city) {
  const c = String(country || '').trim()
  const cityVal = String(city || '').trim()
  return Boolean(c && cityVal && c !== 'all' && cityVal !== 'all')
}

function normalizeGeo(country, city) {
  const countrySlug = countryLabelToUrlSlug(country)
  const citySlug = cityLabelToUrlSlug(city)
  if (!countrySlug || !citySlug) return null
  return { countrySlug, citySlug }
}

function resolvePropertySegment(property) {
  const slug = getPropertySlugFromRecord(property)
  if (slug) return slug
  return property?.id != null ? String(property.id) : ''
}

function buildSectionPropertyPath(section, property, { country, city } = {}) {
  const segment = resolvePropertySegment(property)
  if (!segment) {
    if (section === 'co-investment') return getCoInvestmentDetailPath(property)
    return getPropertyDetailPath(property)
  }

  if (hasListingGeoContext(country, city)) {
    const geo = normalizeGeo(country, city)
    if (geo) return `/${section}/${geo.countrySlug}/${geo.citySlug}/property/${segment}`
  }

  if (section === 'co-investment') return getCoInvestmentDetailPath(property)
  return `/${section}/property/${segment}`
}

export function getAuctionContextPropertyPath(property, { country, city } = {}) {
  return buildSectionPropertyPath('auction', property, { country, city })
}

export function getDebtsContextPropertyPath(property, { country, city } = {}) {
  return buildSectionPropertyPath('debts', property, { country, city })
}

export function getCoInvestmentContextPropertyPath(property, { country, city } = {}) {
  return buildSectionPropertyPath('co-investment', property, { country, city })
}
