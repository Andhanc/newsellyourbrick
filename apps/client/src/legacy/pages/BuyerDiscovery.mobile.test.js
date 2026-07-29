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

test('buyer subscription plans use one readable card per row on mobile', () => {
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plan-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  )
  assert.match(
    buyerPageCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.buyer-plan__button\s*\{[\s\S]*min-height:\s*44px/,
  )
  assert.match(
    buyerPageCss,
    /\.buyer-plan__price\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto[\s\S]*height:\s*auto/,
  )
})

test('every buyer plan shows a crossed-out price and a visible saving', () => {
  assert.match(buyerPage, /oldPrice:\s*'€29'/)
  assert.match(buyerPage, /oldPrice:\s*'€199'/)
  assert.match(buyerPage, /oldPrice:\s*'€699'/)
  assert.match(buyerPage, /buyer-plan__discount/)
  assert.match(buyerPage, /buyer-plan__price-benefit/)
  assert.match(buyerPage, /<del>\{plan\.oldPrice\}<\/del>/)
  assert.match(buyerPage, /Сейчас все тарифы доступны по специальной цене/)
})
