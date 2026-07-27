import { getPropertySlugFromRecord } from './propertySlug'
import {
  CO_INVESTMENT_LEGACY_PATH,
  CO_INVESTMENT_PATH,
  TEST_DRIVE_PATH,
} from './sectionPaths'

export { CO_INVESTMENT_LEGACY_PATH, CO_INVESTMENT_PATH, TEST_DRIVE_PATH }

const SHARE_LISTING_TYPES = new Set(['apartment', 'house', 'villa', 'commercial'])

export function getCoInvestmentDetailPath(property) {
  if (!property || property.id == null) return CO_INVESTMENT_PATH
  const slug = getPropertySlugFromRecord(property)
  if (slug) return `${CO_INVESTMENT_PATH}/${slug}`
  const id = property.id
  const pt = String(property.property_type || '').trim().toLowerCase()
  if (SHARE_LISTING_TYPES.has(pt)) return `${CO_INVESTMENT_PATH}/${pt}-${id}`
  return `${CO_INVESTMENT_PATH}/${id}`
}

/** @deprecated используйте getCoInvestmentDetailPath */
export function getShareListingPath(property) {
  return getCoInvestmentDetailPath(property)
}

export function rewriteSharesPathToCoInvestment(path) {
  const p = String(path || '')
  if (p === CO_INVESTMENT_LEGACY_PATH) return CO_INVESTMENT_PATH
  if (p.startsWith(`${CO_INVESTMENT_LEGACY_PATH}/`)) {
    return `${CO_INVESTMENT_PATH}${p.slice(CO_INVESTMENT_LEGACY_PATH.length)}`
  }
  return p
}
