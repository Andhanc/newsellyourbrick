import {
  consumeBuyerReturnContext,
  readBuyerReturnContext,
  validateBuyerReturnPath,
  writeBuyerReturnContext,
} from './buyerReturnContext.js'

export function isSafeWalletFromPath(p) {
  const validated = validateBuyerReturnPath(p, { fallback: null })
  return validated != null && validated.split(/[?#]/, 1)[0] !== '/deposit'
}

/** Запоминаем, откуда открыли депозит (/deposit) (переживает редирект Stripe и потерю location.state). */
export function setWalletEntryFrom(pathname) {
  if (pathname === '/deposit') return
  writeBuyerReturnContext(pathname)
}

export function getWalletEntryFrom() {
  const path = readBuyerReturnContext({ fallback: null })
  return path === '/deposit' ? null : path
}

export function clearWalletEntryFrom() {
  consumeBuyerReturnContext({ fallback: null })
}

/** Переход на кошелёк с запоминанием текущей страницы для кнопки «Назад». */
export function navigateToWallet(navigate, currentPathname) {
  const from = typeof currentPathname === 'string' ? currentPathname : ''
  if (isSafeWalletFromPath(from)) {
    setWalletEntryFrom(from)
  }
  navigate('/deposit', isSafeWalletFromPath(from) ? { state: { from } } : undefined)
}
