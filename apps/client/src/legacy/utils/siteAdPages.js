export const SITE_AD_PAGES = [
  { id: 'home', label: 'Главная' },
  { id: 'auction', label: 'Аукцион' },
  { id: 'shares', label: 'Доли' },
  { id: 'test-drive', label: 'Test-drive' },
  { id: 'debts', label: 'Долги' },
]

export const SITE_AD_TYPE_LABELS = {
  modal: 'Модальное окно',
  block: 'Рекламный блок',
}

/** @returns {'home'|'auction'|'shares'|'test-drive'|'debts'|null} */
export function pathnameToAdPage(pathname) {
  if (pathname === '/') return 'home'
  if (pathname === '/main' || pathname.startsWith('/auction')) return 'auction'
  if (pathname.startsWith('/co-investment') || pathname.startsWith('/shares')) return 'shares'
  if (pathname === '/test-drive') return 'test-drive'
  if (pathname === '/debts') return 'debts'
  return null
}

export function getSiteAdPageLabel(pageId) {
  return SITE_AD_PAGES.find((p) => p.id === pageId)?.label || pageId
}

const MODAL_SEEN_PREFIX = 'site_ad_modal_seen_'
const BLOCK_DISMISSED_PREFIX = 'site_ad_block_dismissed_'

export function isSiteAdModalSeen(adId) {
  try {
    return localStorage.getItem(`${MODAL_SEEN_PREFIX}${adId}`) === '1'
  } catch {
    return false
  }
}

export function markSiteAdModalSeen(adId) {
  try {
    localStorage.setItem(`${MODAL_SEEN_PREFIX}${adId}`, '1')
  } catch {
    /* ignore */
  }
}

export function isSiteAdBlockDismissed(adId) {
  try {
    return localStorage.getItem(`${BLOCK_DISMISSED_PREFIX}${adId}`) === '1'
  } catch {
    return false
  }
}

export function markSiteAdBlockDismissed(adId) {
  try {
    localStorage.setItem(`${BLOCK_DISMISSED_PREFIX}${adId}`, '1')
  } catch {
    /* ignore */
  }
}
