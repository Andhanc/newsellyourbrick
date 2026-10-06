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
  assert.match(favorites, /favoritesPage_emptyTitle/)
  assert.doesNotMatch(favorites, /Подборка для решения/)
})

test('map is a mobile canvas with a stateful results sheet and guided filters drawer', () => {
  assert.match(map, /resultsSheetState/)
  assert.match(map, /map-page-list--\$\{resultsSheetState\}/)
  assert.match(map, /<BuyerSheetShell/)
  assert.match(map, /map-results-sheet__handle/)
  assert.match(map, /map-results-sheet__chrome/)
  assert.match(map, /expandResultsSheet/)
  assert.match(map, /collapseResultsSheet/)
  assert.match(map, /applyNestedSheetScroll/)
  assert.match(map, /isResultsListAtTop/)
  assert.match(map, /listScrollRef/)
  assert.match(map, /onFocusOnMap=\{focusOnProperty\}/)
  assert.doesNotMatch(map, /onScroll=\{handleResultsListScroll\}/)
  assert.match(mapCss, /@media \(max-width:\s*768px\)[\s\S]*\.map-page-root[\s\S]*height:\s*100dvh/)
  assert.match(mapCss, /\.map-page-list--peek/)
  assert.match(mapCss, /\.map-page-list--expanded[\s\S]*height:\s*100dvh/)
  assert.match(
    mapCss,
    /\.map-page-list--expanded \.map-list-scroll[\s\S]*overflow-y:\s*auto/,
  )
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

test('buyer landing reuses the seller subscription controls and checkout drawer', async () => {
  const offers = await readFile(new URL('../components/BuyerSubscriptionOffers.jsx', import.meta.url), 'utf8')
  const offersCss = await readFile(new URL('../components/BuyerSubscriptionOffers.css', import.meta.url), 'utf8')
  const subscriptions = await readFile(new URL('./Subscriptions.jsx', import.meta.url), 'utf8')
  assert.match(buyerPage, /<BuyerSubscriptionOffers currentPlanVisual=\{displayTier\} userId=\{numericUserId\}/)
  assert.match(subscriptions, /<BuyerSubscriptionOffers/)
  assert.match(offers, /<PricingInteraction/)
  assert.match(offers, /<OwnerPricingCards/)
  assert.match(offers, /<SubscriptionScreen/)
  assert.match(offersCss, /@media \(max-width: 900px\)/)
  assert.match(offersCss, /\.buyer-subscription-offers__desktop \{ display: none; \}/)
})

test('buyer subscription offers keep buyer tiers, annual discount and Stripe checkout', async () => {
  const offers = await readFile(new URL('../components/BuyerSubscriptionOffers.jsx', import.meta.url), 'utf8')
  assert.match(offers, /PLAN_ORDER = \['starter', 'pro', 'vip'\]/)
  assert.match(offers, /PLAN_PRICES = \{ starter: 0, pro: 149, vip: 499 \}/)
  assert.match(offers, /yearlyDiscount=\{0\.25\}/)
  assert.match(offers, /monthlyPrice \* 0\.75/)
  assert.match(offers, /startProSubscriptionCheckout/)
  assert.match(offers, /startVipSubscriptionCheckout/)
  assert.match(offers, /requestOpenLoginModal/)
  assert.match(offers, /PLAN_RANK\[planId\] <= PLAN_RANK\[activePlanId\]/)
})
