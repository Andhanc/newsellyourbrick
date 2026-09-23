import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const headerCss = await readFile(new URL('../pages/MainPage.css', import.meta.url), 'utf8')
const mobileHeaderCss = await readFile(new URL('./HeaderMobileLayout.css', import.meta.url), 'utf8')
const catalogCss = await readFile(new URL('./HeaderPinnedCatalogNav.css', import.meta.url), 'utf8')
const auctionCss = await readFile(new URL('./ui/AuctionMobileLayout.css', import.meta.url), 'utf8')

test('mobile header primary controls expose 44px touch targets', () => {
  assert.match(headerCss, /\.new-header__menu-btn[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/)
  assert.match(headerCss, /\.new-header__search-btn,[\s\S]*\.new-header__notification-btn,[\s\S]*\.new-header__user-btn[\s\S]*min-width:\s*44px/)
  assert.match(catalogCss, /\.header-pinned-catalog-nav__label[\s\S]*min-height:\s*44px/)
  assert.match(catalogCss, /\.header-pinned-catalog-nav__toggle[\s\S]*min-width:\s*44px/)
})

test('expanded mobile search has a styled field and results panel', () => {
  assert.match(headerCss, /\.new-header \.new-header__search-wrapper[\s\S]*position:\s*relative[\s\S]*width:\s*100%/)
  assert.match(headerCss, /\.new-header\.new-header--search-open \.new-header__container\.new-header__container[\s\S]*padding:\s*0\s*!important/)
  assert.match(headerCss, /\.new-header \.new-header__search-field[\s\S]*display:\s*flex[\s\S]*min-height:\s*60px[\s\S]*border-radius:\s*19px/)
  assert.match(headerCss, /\.new-header \.new-header__search-results[\s\S]*position:\s*absolute[\s\S]*border-radius:\s*14px/)
  assert.match(headerCss, /\.new-header--search-open \.new-header__left\s*\{[\s\S]*display:\s*none\s*!important/)
  assert.match(headerCss, /\.new-header \.new-header__search-field:hover,[\s\S]*\.new-header \.new-header__search-field:focus-within/)
})

test('authenticated mobile header keeps the menu visible and shrinks the catalogue label', () => {
  assert.match(mobileHeaderCss, /\.new-header:not\(\.new-header--search-open\) \.new-header__left[\s\S]*flex:\s*0 0 44px/)
  assert.match(mobileHeaderCss, /grid-template-columns:\s*minmax\(0, 1fr\) repeat\(3, 44px\)/)
  assert.match(mobileHeaderCss, /\.header-pinned-catalog-nav__label[\s\S]*min-width:\s*0[\s\S]*text-overflow:\s*ellipsis/)
  assert.match(mobileHeaderCss, /\.header-pinned-catalog-nav__toggle[\s\S]*min-width:\s*44px/)
})

test('mobile header uses a full-bleed top sheet with bottom-only rounding', () => {
  assert.match(mobileHeaderCss, /body \.new-header\.new-header[\s\S]*padding:\s*0\s*!important[\s\S]*background:\s*transparent\s*!important[\s\S]*box-shadow:\s*none\s*!important/)
  assert.match(mobileHeaderCss, /body \.new-header\.new-header \.new-header__container\.new-header__container[\s\S]*width:\s*100%\s*!important[\s\S]*max-width:\s*none\s*!important/)
  assert.match(mobileHeaderCss, /min-height:\s*calc\(72px \+ env\(safe-area-inset-top, 0px\)\)/)
  assert.match(mobileHeaderCss, /padding:[\s\S]*calc\(12px \+ env\(safe-area-inset-top, 0px\)\)/)
  assert.match(mobileHeaderCss, /border-radius:\s*0 0 28px 28px\s*!important/)
  assert.match(mobileHeaderCss, /border:\s*0\s*!important/)
})

test('mobile header layout stays identical in web and legacy bundles', async () => {
  const legacyHeaderCss = await readFile(
    new URL('../../apps/client/src/legacy/components/HeaderMobileLayout.css', import.meta.url),
    'utf8',
  )
  const headerSource = await readFile(new URL('./Header.jsx', import.meta.url), 'utf8')
  const legacyHeaderSource = await readFile(
    new URL('../../apps/client/src/legacy/components/Header.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(mobileHeaderCss, legacyHeaderCss)
  assert.equal(headerSource, legacyHeaderSource)
})

test('auction catalogue keeps the approved two-card grid on the narrowest phones', () => {
  assert.match(auctionCss, /@media\s*\(max-width:\s*374px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(auctionCss, /\.auction-mobile-stack--desktop-cards \.auction-card__favorite[\s\S]*width:\s*44px[\s\S]*height:\s*44px/)
})
