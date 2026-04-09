import { isAuthenticated } from '../services/authService'
import { showNotification } from './toastHelper'

/**
 * @param {boolean} [clerkSignedIn] — передать true, если пользователь вошёл через Clerk (useUser: user && isLoaded)
 */
export const ensureCanOpenProperty = (clerkSignedIn) => {
  const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('userRole') === 'admin'
  if (isAdmin || isAuthenticated() || clerkSignedIn === true) {
    return true
  }

  showNotification('Для просмотра объекта необходимо зарегистрироваться или войти в аккаунт')
  try {
    sessionStorage.setItem('login_modal_force_open', 'true')
    window.dispatchEvent(new Event('forceOpenLoginModal'))
  } catch {
    // ignore
  }
  return false
}

