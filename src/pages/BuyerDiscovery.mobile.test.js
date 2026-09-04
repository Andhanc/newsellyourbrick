import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [search, searchCss, city, cityCss, favorites, favoritesCss, map, mapCss, buyerPageCss, buyerPage] = await Promise.all([
  readFile(new URL('./SearchResults.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./SearchResults.css', import.meta.url), 'utf8'),
  readFile(new URL('./CatalogCityPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./CatalogCityPage.css', import.meta.url), 'utf8'),
  readFile(new URL('./Favorites.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./Favorites.css', import.meta.url), 'utf8'),
  readFile(new URL('./MapPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./MapPage.css', import.meta.url), 'utf8'),
  readFile(new URL('./BuyerPage.css', import.meta.url), 'utf8'),
  readFile(new URL('./BuyerPage.jsx', import.meta.url), 'utf8'),
])

test('search and city catalogues paginate sixteen real items and expose a map decision', () => {
  assert.match(search, /paginateBuyerCatalogue\(filteredProperties, currentPage\)/)
  assert.match(search, /seenListingKeys/)
  assert.match(search, /<ListingPagePagination/)
  assert.match(search, /navigate\('\/map'\)/)
  assert.match(city, /paginateBuyerCatalogue\(properties, currentPage\)/)
  assert.match(city, /<ListingPagePagination/)
  assert.match(city, /to="\/map"/)
})

test('buyer catalogue screens keep exactly two cards per row at phone widths', () => {
  assert.match(searchCss, /@media \(max-width:\s*768px\)[\s\S]*\.search-results__grid[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(cityCss, /@media \(max-width:\s*768px\)[\s\S]*\.catalog-city__grid[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(favoritesCss, /@media \(max-width:\s*768px\)[\s\S]*\.favorites-page__grid\.properties-grid--auction-cards[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
})

test('favorites behaves like a private shortlist with pagination and guided help drawer', () => {
  assert.match(favorites, /paginateBuyerCatalogue\(favoriteAuctions, currentPage\)/)
  assert.match(favorites, /<ListingPagePagination/)
  assert.match(favorites, /<BuyerSheetShell/)
  assert.match(favorites, /Понравилось/)
  assert.doesNotMatch(favorites, /Подборка для решения/)
})

test('map is a mobile canvas with a stateful results sheet and guided filters drawer', () => {
  assert.match(map, /resultsSheetState/)
  assert.match(map, /map-page-list--\$\{resultsSheetState\}/)
  assert.match(map, /<BuyerSheetShell/)
  assert.match(map, /map-results-sheet__handle/)
  assert.match(mapCss, /@media \(max-width:\s*768px\)[\s\S]*\.map-page-root[\s\S]*height:\s*100dvh/)
  assert.match(mapCss, /\.map-page-list--peek/)
  assert.match(mapCss, /\.map-page-list--expanded/)
  assert.match(
    mapCss,
    /@media \(max-width:\s*768px\)[\s\S]*\.map-page-property-grid \.auction-card__actions[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)\s*!important/,
  )
})

test('discovery mobile controls stay touch-safe and reduced-motion aware', () => {
  for (const css of [searchCss, cityCss, favoritesCss, mapCss]) {
    assert.match(css, /44px/)
    assert.match(css, /prefers-reduced-motion:\s*reduce/)
  }
})

test('all buyer subscription plans share one full-size swipe carousel on mobile', () => {
  assert.match(buyerPage, /className="buyer-plan-carousel"/)
  assert.match(buyerPage, /\{plans\.map\(renderPlan\)\}/)
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plan-carousel\s*\{[\s\S]*grid-auto-flow:\s*column[\s\S]*grid-auto-columns:\s*min\(86vw,\s*344px\)[\s\S]*overflow-x:\s*auto[\s\S]*scroll-snap-type:\s*x mandatory/,
  )
  assert.match(buyerPageCss, /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plan\.buyer-plan--tier-vip,[\s\S]*grid-column:\s*auto[\s\S]*display:\s*flex/)
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plan__button\s*\{[\s\S]*min-height:\s*52px/,
  )
  assert.match(
    buyerPageCss,
    /\.buyer-plan__price\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto[\s\S]*height:\s*auto/,
  )
})

test('buyer subscription intro is left-aligned on mobile', () => {
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plans\s*\{[\s\S]*scroll-margin-top:\s*96px/,
  )
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plans__content\s*\{[\s\S]*justify-items:\s*stretch[\s\S]*text-align:\s*left/,
  )
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plans__offer-note\s*\{[\s\S]*justify-content:\s*flex-start[\s\S]*text-align:\s*left/,
  )
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plans h2\s*\{[\s\S]*font-size:\s*clamp\(28px,\s*7vw,\s*35px\)[\s\S]*text-wrap:\s*balance/,
  )
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*420px\)[\s\S]*\.buyer-plans__content\s*\{[\s\S]*width:\s*calc\(100% - 32px\)/,
  )
})

test('all plan cards are white with tier-colored pills and animated underglows', () => {
  assert.match(buyerPage, /className="buyer-plan__hero"/)
  assert.match(buyerPage, /className="buyer-plan__body"/)
  assert.match(buyerPageCss, /--plan-pill-bg:\s*#171717/)
  assert.match(buyerPageCss, /buyer-plan--tier-pro\s*\{[\s\S]*--plan-pill-bg:\s*#7c3aed/)
  assert.match(buyerPageCss, /buyer-plan--tier-vip\s*\{[\s\S]*--plan-pill-bg:\s*#4ecdd6/)
  assert.match(buyerPageCss, /buyer-plan--tier-pro\s*\{[\s\S]*--plan-glow:\s*rgba\(124,\s*58,\s*237,\s*0\.72\)/)
  assert.match(buyerPageCss, /buyer-plan--tier-vip\s*\{[\s\S]*--plan-glow:\s*rgba\(78,\s*205,\s*214,\s*0\.72\)/)
  assert.match(buyerPageCss, /\.buyer-plan__hero\s*\{[\s\S]*background:\s*#ffffff/)
  assert.match(buyerPageCss, /\.buyer-plan__body\s*\{[\s\S]*background:\s*#ffffff/)
  assert.match(buyerPageCss, /buyer-plan__eyebrow,[\s\S]*buyer-plan__discount\s*\{[\s\S]*background:\s*var\(--plan-pill-gradient\)/)
  assert.match(buyerPageCss, /buyer-plan--tier-pro::after,[\s\S]*buyer-plan--tier-vip::after\s*\{[\s\S]*bottom:\s*-32px[\s\S]*height:\s*78px[\s\S]*filter:\s*blur\(36px\)[\s\S]*opacity:\s*0/)
  assert.match(buyerPageCss, /buyer-plan--tier-pro::after\s*\{[\s\S]*buyer-plan-underglow-in\s*900ms\s*140ms/)
  assert.match(buyerPageCss, /buyer-plan--tier-vip::after\s*\{[\s\S]*buyer-plan-underglow-in\s*900ms\s*260ms/)
  assert.match(buyerPageCss, /@keyframes buyer-plan-underglow-in/)
  assert.match(buyerPageCss, /@keyframes buyer-plan-underglow-checkout/)
  assert.match(buyerPageCss, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/)
})

test('Pro and VIP plans expose expanded benefits', () => {
  assert.match(buyerPage, /buyerLanding_planStarterFeat3/)
  assert.match(buyerPage, /buyerLanding_planProFeat3/)
  assert.match(buyerPage, /buyerLanding_planProFeat5/)
  assert.match(buyerPage, /buyerLanding_planVipFeat6/)
})

test('every buyer plan shows a crossed-out price and a visible saving', () => {
  assert.match(buyerPage, /oldPrice:\s*'€29'/)
  assert.match(buyerPage, /oldPrice:\s*'€199'/)
  assert.match(buyerPage, /oldPrice:\s*'€699'/)
  assert.match(buyerPage, /buyer-plan__discount/)
  assert.match(buyerPage, /buyer-plan__price-values/)
  assert.match(buyerPage, /<del className="buyer-plan__price-was">\{plan\.oldPrice\}<\/del>/)
  assert.match(buyerPageCss, /buyer-plan__price-was::after\s*\{[\s\S]*transform:\s*rotate\(-8deg\)/)
  assert.match(buyerPageCss, /buyer-plan__price-saving::before\s*\{[\s\S]*border:\s*2px solid var\(--plan-accent\)[\s\S]*rotate\(-2deg\)/)
  assert.match(buyerPage, /buyerLanding_checkoutNote/)
  assert.match(buyerPage, /buyerLanding_plansOfferNote/)
})

test('plan cards skip selection and start checkout directly', () => {
  assert.doesNotMatch(buyerPage, /selectedPlan|pickPlan|buyer-subscribe-panel/)
  assert.match(buyerPage, /startProSubscriptionCheckout/)
  assert.match(buyerPage, /startVipSubscriptionCheckout/)
  assert.match(buyerPage, /const openPlanCheckout = async \(plan\)/)
  assert.match(buyerPage, /onClick=\{\(\) => void openPlanCheckout\(plan\)\}/)
  assert.match(buyerPage, /navigate\('\/subscriptions\?plan=starter#subscriptions-pricing-section'\)/)
  assert.match(buyerPage, /buyer-plan__button-price/)
})
