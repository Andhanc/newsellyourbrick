import { getUserData } from '../services/authService'
import { isSellerCabinetRole, readStoredUserRole } from './cabinetRoutes'
import { buildOwnerTestPath, OWNER_VIEWS } from './ownerTestNav'
import { resolveSellCabinetMode } from './navigateToSellPurchasedProperty'
import { requestOpenLoginModal } from './requestOpenLoginModal'
import { isSiteUserSignedIn } from './siteAuthGate'
import { scrollMainTo } from './mainScroll'

export const SELLER_LISTING_CTA_QUERY = 'becomeSeller'
export const PENDING_BECOME_SELLER_CTA_KEY = 'pending_become_seller_cta'

async function navigateBuyerToBecomeSeller(navigate) {
  const mode = await resolveSellCabinetMode()
  try {
    sessionStorage.setItem('pending_sell_role_switch_mode', mode)
    sessionStorage.setItem(PENDING_BECOME_SELLER_CTA_KEY, '1')
  } catch {
    // ignore
  }
  navigate(`/profile?${SELLER_LISTING_CTA_QUERY}=1`)
}

/**
 * CTA «разместить / рассчитать продажу»: продавец → новый флоу добавления,
 * покупатель → профиль с дровером «стать продавцом».
 */
export async function navigateSellerListingCta(navigate, { user, userLoaded } = {}) {
  scrollMainTo(0, 0, 'instant')

  const signedIn =
    isSiteUserSignedIn(user, userLoaded) ||
    getUserData()?.isLoggedIn ||
    localStorage.getItem('isLoggedIn') === 'true'

  if (!signedIn) {
    try {
      sessionStorage.setItem('login_modal_user_role', 'seller')
    } catch {
      // ignore
    }
    requestOpenLoginModal({ wizard: true })
    return
  }

  const role = readStoredUserRole()
  if (isSellerCabinetRole(role)) {
    navigate(buildOwnerTestPath(OWNER_VIEWS.ADD_PROPERTY))
    return
  }

  await navigateBuyerToBecomeSeller(navigate)
}

/** CTA «Стать продавцом» на лендинге продавца — тот же флоу, явный intent. */
export async function navigateBecomeSellerCta(navigate, { user, userLoaded } = {}) {
  await navigateSellerListingCta(navigate, { user, userLoaded })
}
