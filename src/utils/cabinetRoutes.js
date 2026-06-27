import { getUserData } from '../services/authService'

const OWNER_CABINET_HOME_PATH = '/owner-test'
const OWNER_SUBSCRIPTIONS_PATH = '/owner-test/subscriptions'

/** @returns {'admin' | 'seller' | 'owner' | 'buyer' | 'client'} */
export function readStoredUserRole() {
  const userData = getUserData()
  const stored = String(userData?.role || localStorage.getItem('userRole') || 'client').toLowerCase()

  if (stored === 'admin' && localStorage.getItem('isAdminLoggedIn') === 'true') {
    return 'admin'
  }

  if (
    stored === 'seller' ||
    stored === 'owner' ||
    localStorage.getItem('isOwnerLoggedIn') === 'true'
  ) {
    return stored === 'owner' ? 'owner' : 'seller'
  }

  return stored === 'buyer' ? 'buyer' : 'client'
}

export function isSellerCabinetRole(role = readStoredUserRole()) {
  return role === 'seller' || role === 'owner'
}

/** Главная страница личного кабинета по роли. */
export function getCabinetHomePath(role = readStoredUserRole()) {
  if (role === 'admin') return '/admin'
  if (isSellerCabinetRole(role)) return OWNER_CABINET_HOME_PATH
  return '/profile'
}

/** Профиль / личный кабинет. */
export function getCabinetProfilePath(role = readStoredUserRole()) {
  return getCabinetHomePath(role)
}

/** Персональные данные и документы. */
export function getCabinetDataPath(role = readStoredUserRole()) {
  if (isSellerCabinetRole(role)) return '/owner-test/profile'
  return '/profile?data=1'
}

/** Кошелёк / депозит: покупатель — /wallet, продавец — кабинет owner-test. */
export function getCabinetWalletPath(role = readStoredUserRole()) {
  if (isSellerCabinetRole(role)) return '/owner-test/wallet'
  return '/wallet'
}

/** Подписки: покупатель — лист в /profile, продавец — /owner-test/subscriptions. */
export function getCabinetSubscriptionsPath(role = readStoredUserRole()) {
  if (isSellerCabinetRole(role)) return OWNER_SUBSCRIPTIONS_PATH
  return '/profile?subscriptions=1'
}

export function isCabinetSubscriptionsPath(pathname, search = '', role = readStoredUserRole()) {
  if (isSellerCabinetRole(role)) {
    return (
      pathname === OWNER_SUBSCRIPTIONS_PATH ||
      pathname.startsWith('/owner-subscriptions-test')
    )
  }
  const params = new URLSearchParams(search)
  return (pathname === '/profile' || pathname.startsWith('/profile/')) && params.get('subscriptions') === '1'
}

/** Ссылка на поле в разделе «Данные» (например из VerificationToast). */
export function getCabinetDataFieldPath(field, role = readStoredUserRole()) {
  const encoded = encodeURIComponent(field)
  if (isSellerCabinetRole(role)) return `/owner-test/profile?highlight=${encoded}`
  return `/profile?data=1&highlight=${encoded}`
}

export function isCabinetProfilePath(pathname, role = readStoredUserRole()) {
  if (isSellerCabinetRole(role)) {
    return pathname === OWNER_CABINET_HOME_PATH || pathname.startsWith('/owner-')
  }
  return pathname === '/profile' || pathname.startsWith('/profile/')
}

export function isCabinetDataPath(pathname, search = '', role = readStoredUserRole()) {
  const params = new URLSearchParams(search)
  if (isSellerCabinetRole(role)) {
    return pathname === '/owner-test/profile' || (pathname === '/owner-test' && params.get('view') === 'profile')
  }
  return (pathname === '/profile' || pathname.startsWith('/profile/')) && params.get('data') === '1'
}
