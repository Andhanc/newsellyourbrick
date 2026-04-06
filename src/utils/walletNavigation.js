const WALLET_ENTRY_FROM_KEY = 'syb_wallet_entry_from'

export function isSafeWalletFromPath(p) {
  return (
    typeof p === 'string' &&
    p.startsWith('/') &&
    !p.startsWith('//') &&
    p !== '/wallet'
  )
}

/** Запоминаем, откуда открыли /wallet (переживает редирект Stripe и потерю location.state). */
export function setWalletEntryFrom(pathname) {
  if (!isSafeWalletFromPath(pathname)) return
  try {
    sessionStorage.setItem(WALLET_ENTRY_FROM_KEY, pathname)
  } catch {
    /* ignore */
  }
}

export function getWalletEntryFrom() {
  try {
    const v = sessionStorage.getItem(WALLET_ENTRY_FROM_KEY)
    return isSafeWalletFromPath(v) ? v : null
  } catch {
    return null
  }
}

export function clearWalletEntryFrom() {
  try {
    sessionStorage.removeItem(WALLET_ENTRY_FROM_KEY)
  } catch {
    /* ignore */
  }
}

/** Переход на кошелёк с запоминанием текущей страницы для кнопки «Назад». */
export function navigateToWallet(navigate, currentPathname) {
  const from = typeof currentPathname === 'string' ? currentPathname : ''
  if (isSafeWalletFromPath(from)) {
    setWalletEntryFrom(from)
  }
  navigate('/wallet', isSafeWalletFromPath(from) ? { state: { from } } : undefined)
}
