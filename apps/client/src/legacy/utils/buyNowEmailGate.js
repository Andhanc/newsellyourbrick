import { getUserData, isAuthenticated } from '../services/authService'

/**
 * Почта нужна для писем при одобрении/завершении сделки (сервер тоже проверяет).
 * Если пользователь не авторизован — true (дальше сработает экран входа).
 */
export function hasEmailForBuyNowFlow(clerkUser, clerkUserLoaded) {
  const clerkSignedIn = clerkUserLoaded && clerkUser
  const legacyIn = isAuthenticated()

  if (!clerkSignedIn && !legacyIn) {
    return true
  }

  if (clerkSignedIn) {
    const e =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress
    if (e && String(e).trim()) {
      return true
    }
    if (legacyIn) {
      const ud = getUserData()
      if (ud?.email && String(ud.email).trim()) {
        return true
      }
    }
    return false
  }

  if (legacyIn) {
    const ud = getUserData()
    return !!(ud?.email && String(ud.email).trim())
  }

  return true
}
