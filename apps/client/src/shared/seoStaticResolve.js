const CO_INVESTMENT_PATH = '/co-investment'
const TEST_DRIVE_PATH = '/test-drive'

const STATIC_ROUTES = {
  '/': { titleKey: 'pageSeoHomeTitle', descKey: 'pageSeoHomeDescription' },
  '/auction': { titleKey: 'pageSeoAuctionTitle', descKey: 'pageSeoAuctionDescription' },
  '/debts': { titleKey: 'pageSeoDebtsTitle', descKey: 'pageSeoDebtsDescription' },
  [CO_INVESTMENT_PATH]: {
    titleKey: 'pageSeoCoInvestmentTitle',
    descKey: 'pageSeoCoInvestmentDescription',
  },
  [TEST_DRIVE_PATH]: {
    titleKey: 'pageSeoTestDriveTitle',
    descKey: 'pageSeoTestDriveDescription',
  },
  '/about': { titleKey: 'pageSeoAboutTitle', descKey: 'pageSeoAboutDescription' },
  '/news': { titleKey: 'pageSeoNewsTitle', descKey: 'pageSeoNewsDescription' },
  '/map': { titleKey: 'pageSeoMapTitle', descKey: 'pageSeoMapDescription' },
}

/**
 * SEO для статических маршрутов без catalogGeo / auctionFilterUrl.
 * @param {string} pathname
 * @param {(key: string, opts?: object) => string} t
 */
export function resolveStaticPageSeo(pathname, t) {
  const path = !pathname || pathname === '/main' ? '/auction' : pathname
  const hit = STATIC_ROUTES[path]
  if (!hit) return null
  return {
    title: t(hit.titleKey),
    description: t(hit.descKey),
    canonicalPath: path,
  }
}
