/**
 * Полный URL страницы завершения OAuth (должен совпадать с маршрутом /oauth-bridge и с настройками Clerk).
 */
export function getClerkOAuthReturnUrl() {
  if (typeof window === 'undefined') return '/oauth-bridge'
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const path = base && base !== '/' ? `${base}/oauth-bridge` : '/oauth-bridge'
  return `${window.location.origin}${path}`
}
