import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const headerCss = await readFile(new URL('../pages/MainPage.css', import.meta.url), 'utf8')
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

test('auction catalogue keeps the approved two-card grid on the narrowest phones', () => {
  assert.match(auctionCss, /@media\s*\(max-width:\s*374px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(auctionCss, /\.auction-mobile-stack--desktop-cards \.auction-card__favorite[\s\S]*width:\s*44px[\s\S]*height:\s*44px/)
})
