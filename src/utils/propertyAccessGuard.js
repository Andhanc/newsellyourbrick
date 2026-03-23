import { isAuthenticated } from '../services/authService'
import { showNotification } from './toastHelper'

export const ensureCanOpenProperty = () => {
  const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('userRole') === 'admin'
  if (isAdmin || isAuthenticated()) {
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

