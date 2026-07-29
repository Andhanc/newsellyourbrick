/**
 * Запоминание «пользователь уже бывал на сайте» для выбора вкладки в LoginModal:
 * первая сессия в браузере → по умолчанию «Регистрация», после визита / входа → «Войти».
 *
 * Не вызывайте markUserHasVisitedSite() из validateSession для гостя: там valid:true и user:null.
 */
const STORAGE_KEY = 'syb_site_has_visit_v1'

export function markUserHasVisitedSite() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* приватный режим / квота */
  }
}

/** true — открывать модалку на «Войти», false — на «Зарегистрироваться» */
export function shouldDefaultLoginModalToLogin() {
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return true
    if (localStorage.getItem('isLoggedIn') === 'true') return true
    const uid = localStorage.getItem('userId')
    if (uid && /^\d+$/.test(String(uid))) return true
  } catch {
    /* ignore */
  }
  return false
}

/** Ставим флаг при уходе со страницы; возвращает cleanup для useEffect */
export function installReturningVisitorListeners() {
  const flush = () => markUserHasVisitedSite()
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  return () => {
    window.removeEventListener('pagehide', flush)
    window.removeEventListener('beforeunload', flush)
  }
}
