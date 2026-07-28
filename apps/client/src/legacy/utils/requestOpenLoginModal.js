/**
 * Открывает модалку входа/регистрации в шапке (событие + sessionStorage).
 * @param {{ wizard?: boolean }} [opts]
 *   wizard: true (по умолчанию) — шаг с двумя карточками роли, затем регистрация/вход;
 *   false — только форма (для сценариев, где режим/роль уже заданы извне).
 */
export function requestOpenLoginModal(opts = {}) {
  const wizard = opts.wizard !== false
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('login_modal_force_open', 'true')
    if (wizard) {
      sessionStorage.setItem('login_modal_force_wizard', 'true')
      sessionStorage.removeItem('login_modal_mode')
      sessionStorage.removeItem('login_modal_user_role')
    } else {
      sessionStorage.removeItem('login_modal_force_wizard')
    }
    window.dispatchEvent(new Event('forceOpenLoginModal'))
  } catch (_) {
    /* ignore */
  }
}
