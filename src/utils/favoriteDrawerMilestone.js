import { properties } from '../data/properties.js'
import { MOCK_SECTIONS } from '../data/favoriteMockLists.js'
import { getComparisonGroupKey, hasDbBackedProperty } from './propertyFavoriteKey.js'
import { isClosedForWishlist } from './resolveBuyerListingState.js'

function countComparableMockFavorites(mockMap, mockCategory, now) {
  const group = getComparisonGroupKey(null, mockCategory)
  let count = 0

  if (getComparisonGroupKey(null, 'property') === group) {
    for (const property of properties) {
      if (mockMap.get(`property-${property.id}`) && !isClosedForWishlist(property, now)) {
        count += 1
      }
    }
  }

  for (const { prefix, list, category } of MOCK_SECTIONS) {
    if (getComparisonGroupKey(null, category) !== group) continue
    for (const property of list || []) {
      if (mockMap.get(`${prefix}${property.id}`) && !isClosedForWishlist(property, now)) {
        count += 1
      }
    }
  }

  return count
}

/** Show milestones for favorites that can actually form a pair in comparison. */
export function getFavoriteDrawerMilestone(property, mockCategory, dbKeys, mockMap, now = new Date()) {
  const countBeforeAdd = hasDbBackedProperty(property)
    ? dbKeys.size
    : countComparableMockFavorites(mockMap, mockCategory, now)

  if (countBeforeAdd === 0) return 'first'
  if (countBeforeAdd === 1) return 'compare'
  return null
}
