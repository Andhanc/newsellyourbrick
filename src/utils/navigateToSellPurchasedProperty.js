import { getUserData } from '../services/authService'
import { OWNER_VIEWS, buildOwnerTestPath } from './ownerTestNav'
import { fetchLinkedRoles } from './roleSwitchApi'
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

function getStoredUserId() {
  const raw = localStorage.getItem('userId') || getUserData()?.id
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function resolveSellCabinetMode() {
  const userId = getStoredUserId()
  if (!userId) return 'register'
  try {
    const status = await fetchLinkedRoles({ userId })
    return status?.seller ? 'switch' : 'register'
  } catch {
    return 'register'
  }
}

/**
 * @param {object} options
 * @param {number|string} options.propertyId
 * @param {object} [options.propertySnapshot]
 * @param {import('react-router-dom').NavigateFunction} options.navigate
 * @param {() => Promise<void>} [options.onBecomeSeller]
 * @param {(ctx: { mode: 'register' | 'switch', propertyId: number, snapshot: object }) => void} [options.onPromptSellerAction]
 * @param {() => void} [options.onPromptSellerRegistration]
 */
export async function navigateToSellPurchasedProperty({
  propertyId,
  propertySnapshot,
  navigate,
  onBecomeSeller,
  onPromptSellerAction,
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

  const cabinetMode = await resolveSellCabinetMode()

  if (typeof onPromptSellerAction === 'function') {
    onPromptSellerAction({ mode: cabinetMode, propertyId: pid, snapshot })
    return
  }

  if (typeof onPromptSellerRegistration === 'function') {
    onPromptSellerRegistration({ mode: cabinetMode, propertyId: pid, snapshot })
    return
  }

  if (typeof onBecomeSeller === 'function') {
    await onBecomeSeller({ mode: cabinetMode, propertyId: pid, snapshot })
    return
  }

  try {
    sessionStorage.setItem('pending_sell_role_switch_mode', cabinetMode)
    window.dispatchEvent(
      new CustomEvent('openRoleSwitchForSell', { detail: { mode: cabinetMode, targetRole: 'seller' } }),
    )
  } catch {
    // ignore
  }
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
