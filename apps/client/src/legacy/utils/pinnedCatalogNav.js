import { CO_INVESTMENT_PATH } from './sectionPaths'

export const PINNED_CATALOG_NAV_KEY = 'pinnedCatalogNavSection'

export const CATALOG_NAV_SECTIONS = [
  { id: 'home', path: '/', labelKey: 'home' },
  { id: 'auction', path: '/auction', labelKey: 'auction' },
  { id: 'shares', path: CO_INVESTMENT_PATH, labelKey: 'footerShares' },
  { id: 'debts', path: '/debts', labelKey: 'auctionPageCtaDebtsTitle' },
]

export const DEFAULT_PINNED_CATALOG_SECTION = 'home'

export function readPinnedCatalogSection() {
  try {
    const stored = localStorage.getItem(PINNED_CATALOG_NAV_KEY)
    if (CATALOG_NAV_SECTIONS.some((section) => section.id === stored)) {
      return stored
    }
  } catch (_) {}
  return DEFAULT_PINNED_CATALOG_SECTION
}

export function writePinnedCatalogSection(sectionId) {
  try {
    localStorage.setItem(PINNED_CATALOG_NAV_KEY, sectionId)
  } catch (_) {}
}

export function getCatalogSectionById(sectionId) {
  return (
    CATALOG_NAV_SECTIONS.find((section) => section.id === sectionId) ||
    CATALOG_NAV_SECTIONS.find((section) => section.id === DEFAULT_PINNED_CATALOG_SECTION) ||
    CATALOG_NAV_SECTIONS[0]
  )
}

export function getActiveCatalogSection(pathname) {
  return CATALOG_NAV_SECTIONS.find((section) => isCatalogSectionActive(pathname, section)) || null
}

export function isCatalogSectionActive(pathname, section) {
  const path = String(pathname || '')
  if (section.id === 'home') {
    return path === '/'
  }
  if (section.id === 'auction') {
    return path === '/auction' || path.startsWith('/auction/')
  }
  if (section.id === 'shares') {
    return path === section.path || path.startsWith(`${section.path}/`) || path.startsWith('/shares')
  }
  return path === section.path || path.startsWith(`${section.path}/`)
}
