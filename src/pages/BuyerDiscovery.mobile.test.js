import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [search, searchCss, city, cityCss, favorites, favoritesCss, map, mapCss] = await Promise.all([
  readFile(new URL('./SearchResults.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./SearchResults.css', import.meta.url), 'utf8'),
  readFile(new URL('./CatalogCityPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./CatalogCityPage.css', import.meta.url), 'utf8'),
  readFile(new URL('./Favorites.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./Favorites.css', import.meta.url), 'utf8'),
  readFile(new URL('./MapPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./MapPage.css', import.meta.url), 'utf8'),
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
  assert.match(favorites, /Подборка для решения/)
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
