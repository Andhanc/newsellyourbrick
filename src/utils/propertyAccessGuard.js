import { isAuthenticated } from '../services/authService'
import { requestOpenLoginModal } from './requestOpenLoginModal'

/**
 * @param {boolean} [clerkSignedIn] — передать true, если пользователь вошёл через Clerk (useUser: user && isLoaded)
 * @returns {boolean} true — можно открывать объект; false — гость (уже открыта модалка входа)
 */
export const ensureCanOpenProperty = (clerkSignedIn) => {
  const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('userRole') === 'admin'
  if (isAdmin || isAuthenticated() || clerkSignedIn === true) {
    return true
  }
  requestOpenLoginModal({ wizard: true })
  return false
}

