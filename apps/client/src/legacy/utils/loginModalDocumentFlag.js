/** Счётчик открытых LoginModal (Header, MainPage, PropertyDetail и т.д.) */
let loginModalOpenCount = 0

/**
 * Открыта ли модалка входа/регистрации.
 * По классу на html скрываем плавающую кнопку AI.
 */
export function setLoginModalOpen(open) {
  if (open) {
    loginModalOpenCount += 1
  } else {
    loginModalOpenCount = Math.max(0, loginModalOpenCount - 1)
  }
  document.documentElement.classList.toggle('login-modal-open', loginModalOpenCount > 0)
}
