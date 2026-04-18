import { isAuthenticated } from '../services/authService'

/**
 * @param {boolean} [clerkSignedIn] — передать true, если пользователь вошёл через Clerk (useUser: user && isLoaded)
 */
export const ensureCanOpenProperty = (clerkSignedIn) => {
  const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('userRole') === 'admin'
  if (isAdmin || isAuthenticated() || clerkSignedIn === true) {
    return true
  }
  return false
}

