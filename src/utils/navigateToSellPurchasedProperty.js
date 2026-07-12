import { getUserData } from '../services/authService'
import { requestOpenLoginModal } from './requestOpenLoginModal'
import { OWNER_VIEWS, buildOwnerTestPath } from './ownerTestNav'
import {
  applyPurchasedPropertyListingPrefill,
  buildPurchasedPropertySnapshot,
  fetchPropertySnapshot,
  readPendingSellPurchasedProperty,
  storePendingSellPurchasedProperty,
} from './purchasedPropertyListingPrefill'

function readUserRole() {
  return String(localStorage.getItem('userRole') || getUserData()?.role || 'buyer').toLowerCase()
}

function isSellerRole(role) {
  return role === 'seller' || role === 'owner'
}

/**
 * @param {object} options
 * @param {number|string} options.propertyId
 * @param {object} [options.propertySnapshot]
 * @param {import('react-router-dom').NavigateFunction} options.navigate
 * @param {() => Promise<void>} [options.onBecomeSeller]
 * @param {() => void} [options.onPromptSellerRegistration]
 */
export async function navigateToSellPurchasedProperty({
  propertyId,
  propertySnapshot,
  navigate,
  onBecomeSeller,
  onPromptSellerRegistration,
}) {
  const pid = propertyId != null ? Number(propertyId) : null
  if (!pid || Number.isNaN(pid)) return

  let snapshot = propertySnapshot
  if (!snapshot?.title) {
    try {
      const property = await fetchPropertySnapshot(pid)
      snapshot = buildPurchasedPropertySnapshot(property)
    } catch {
      snapshot = { id: pid, title: '', image: '' }
    }
  }

  storePendingSellPurchasedProperty(snapshot)

  const role = readUserRole()
  if (isSellerRole(role)) {
    try {
      await applyPurchasedPropertyListingPrefill(pid)
    } catch (e) {
      console.warn('navigateToSellPurchasedProperty prefill:', e)
    }
    navigate(buildOwnerTestPath(OWNER_VIEWS.ADD_PROPERTY))
    return
  }

  if (typeof onPromptSellerRegistration === 'function') {
    onPromptSellerRegistration({ propertyId: pid, snapshot })
    return
  }

  if (typeof onBecomeSeller === 'function') {
    await onBecomeSeller()
    return
  }

  try {
    sessionStorage.setItem('login_modal_mode', 'register')
    sessionStorage.setItem('login_modal_user_role', 'seller')
  } catch {
    // ignore
  }
  requestOpenLoginModal({ wizard: false })
  navigate('/', { replace: true })
}

export async function completePendingSellAfterSellerLogin(navigate) {
  const snapshot = readPendingSellPurchasedProperty()
  if (!snapshot?.id) return false
  if (!isSellerRole(readUserRole())) return false

  try {
    await applyPurchasedPropertyListingPrefill(snapshot.id)
    navigate(buildOwnerTestPath(OWNER_VIEWS.ADD_PROPERTY))
    return true
  } catch (e) {
    console.warn('completePendingSellAfterSellerLogin:', e)
    return false
  }
}
