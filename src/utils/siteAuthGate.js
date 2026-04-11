import { getUserData, isAuthenticated } from '../services/authService'

/** Согласовано с MainPage/Header: Clerk-сессия или локальная запись пользователя */
export function isSiteUserSignedIn(clerkUser, clerkLoaded) {
  if (clerkLoaded && clerkUser) return true
  try {
    if (getUserData()?.isLoggedIn) return true
  } catch (_) {}
  return isAuthenticated()
}

/** Только pathname (без hash/query): маршруты, куда без входа не пускаем (футер, меню, guard страниц). */
export function routeRequiresSiteLogin(to) {
  if (!to || typeof to !== 'string') return false
  const p = to.split('#')[0].split('?')[0]
  if (!p) return false
  if (p === '/map') return true
  if (p === '/chat' || p.startsWith('/chat/')) return true
  if (p === '/wallet' || p === '/bonuses' || p === '/calculator') return true
  if (p === '/profile' || p.startsWith('/profile/')) return true
  return false
}
