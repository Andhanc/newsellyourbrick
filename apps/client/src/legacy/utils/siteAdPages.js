export const SITE_AD_PAGES = [
  { id: 'home', labelKey: 'siteAdPage_home' },
  { id: 'auction', labelKey: 'siteAdPage_auction' },
  { id: 'shares', labelKey: 'siteAdPage_shares' },
  { id: 'test-drive', labelKey: 'siteAdPage_testDrive' },
  { id: 'debts', labelKey: 'siteAdPage_debts' },
]

export const SITE_AD_TYPE_LABEL_KEYS = {
  modal: 'siteAdType_modal',
  block: 'siteAdType_block',
}

/** @deprecated use SITE_AD_TYPE_LABEL_KEYS + t() */
export const SITE_AD_TYPE_LABELS = SITE_AD_TYPE_LABEL_KEYS

/** @returns {'home'|'auction'|'shares'|'test-drive'|'debts'|null} */
export function pathnameToAdPage(pathname) {
  const path = String(pathname || '').split('?')[0]
  if (path.includes('/property/')) return null
  if (path === '/') return 'home'
  if (path === '/main' || path === '/auction' || path.startsWith('/auction/')) return 'auction'
  if (path === '/co-investment' || path === '/shares') return 'shares'
  if (path === '/test-drive') return 'test-drive'
  if (path === '/debts') return 'debts'
  return null
}

export function getSiteAdPageLabel(pageId, t) {
  const page = SITE_AD_PAGES.find((p) => p.id === pageId)
  if (!page) return pageId
  if (page.labelKey && typeof t === 'function') return t(page.labelKey)
  return page.label || pageId
}

export function getSiteAdTypeLabel(type, t) {
  const key = SITE_AD_TYPE_LABEL_KEYS[type]
  if (key && typeof t === 'function') return t(key)
  return key || type
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
