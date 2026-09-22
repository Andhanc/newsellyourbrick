import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(new URL('./fetchAdminSidebarBadges.js', import.meta.url), 'utf8')
const adminPage = await readFile(new URL('../admin/AdminPanelPage.jsx', import.meta.url), 'utf8')
const stats = await readFile(new URL('../components/admin/Statistics.jsx', import.meta.url), 'utf8')
const favorites = await readFile(new URL('../context/PropertyFavoritesContext.jsx', import.meta.url), 'utf8')
const ownerProfile = await readFile(new URL('../pages/OwnerProfileTestPage.jsx', import.meta.url), 'utf8')

test('admin sidebar badges use a single counts endpoint', () => {
  assert.match(src, /\/admin\/sidebar-badges/)
  assert.doesNotMatch(src, /documents\/pending/)
  assert.doesNotMatch(src, /purchase-requests\?limit=1000/)
  assert.doesNotMatch(src, /properties\/auctions/)
})

test('admin panel restores the section from the URL hash', () => {
  assert.match(adminPage, /readAdminSectionFromHash/)
  assert.match(adminPage, /data-admin-section=\{activeSection\}/)
  assert.match(adminPage, /window\.history\.replaceState/)
})

test('admin statistics load auction winners in one batch request', () => {
  assert.match(stats, /auction-winners\/batch\?ids=/)
  assert.doesNotMatch(stats, /auction-winners\/property\/\$\{auction\.id\}/)
})

test('admin statistics dashboard cards load from a single stats endpoint', () => {
  assert.match(stats, /\/admin\/dashboard-stats/)
  assert.doesNotMatch(stats, /admin\/users\/count/)
  assert.doesNotMatch(stats, /admin\/stripe-payments/)
  assert.doesNotMatch(stats, /admin\/properties\/category-stats/)
})

test('seller cabinet does not prefetch listing favorites', () => {
  assert.match(
    favorites,
    /if \(path === '\/owner-test' \|\| path\.startsWith\('\/owner-test\/'\)\) return false/,
  )
})

test('discover hero does not load listing favorites until the catalog mounts', () => {
  assert.match(favorites, /if \(path === '\/'\) return false/)
  assert.match(favorites, /PROPERTY_FAVORITES_NEEDED/)
})

test('seller favorites refresh is skipped off listing routes including owner cabinet', () => {
  assert.match(favorites, /if \(!pathnameNeedsPropertyFavorites\(pathname\)\) return/)
})

test('owner profile statistics requests wait until the statistics tab is open', () => {
  assert.match(ownerProfile, /if \(activeTab !== 'statistics'\) return undefined/)
  assert.match(ownerProfile, /\[loadStatistics, activeTab\]/)
})

test('search results reuse catalog locations instead of search-options', async () => {
  const search = await readFile(new URL('../pages/SearchResults.jsx', import.meta.url), 'utf8')
  const filters = await readFile(new URL('../components/CatalogDesktopFilters.jsx', import.meta.url), 'utf8')
  assert.match(search, /buildLocationOptionsFromProperties/)
  assert.match(search, /locationOptions=\{catalogLocationOptions\}/)
  assert.doesNotMatch(search, /search-options/)
  assert.match(filters, /locationOptionsFromParent !== undefined/)
})

test('seller notification bids load only after the bell drawer opens', async () => {
  const src = await readFile(new URL('../components/OwnerNotificationsButton.jsx', import.meta.url), 'utf8')
  assert.match(src, /if \(items \|\| !open\) return undefined/)
  assert.doesNotMatch(src, /useEffect\(\(\) => \{\s*loadBidNotifications\(\)\s*\}, \[loadBidNotifications\]\)/)
})
