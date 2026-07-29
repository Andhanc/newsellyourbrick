import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./BuyerEmptyState.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./BuyerEmptyState.css', import.meta.url), 'utf8')
const propertyList = await readFile(new URL('../PropertyList.jsx', import.meta.url), 'utf8')
const searchResults = await readFile(new URL('../../pages/SearchResults.jsx', import.meta.url), 'utf8')
const mapPage = await readFile(new URL('../../pages/MapPage.jsx', import.meta.url), 'utf8')

test('buyer empty state explains the recovery and exposes one primary action', () => {
  assert.match(source, /role="status"/)
  assert.match(source, /primaryLabel/)
  assert.match(source, /onPrimary/)
  assert.match(source, /secondaryLabel/)
  assert.match(source, /buyer-empty-state--illustrated/)
  assert.match(source, /buyer-empty-state__image/)
  assert.match(css, /min-height:\s*var\(--buyer-touch\)/)
  assert.match(css, /var\(--buyer-mint\)/)
  assert.match(css, /\.buyer-empty-state__image/)
})

test('auction no-results state no longer uses an emoji dead end', () => {
  assert.match(propertyList, /BuyerEmptyState/)
  assert.match(propertyList, /auction-empty-illustration\.png/)
  assert.match(propertyList, /title="Объектов пока нет"/)
  assert.match(propertyList, /primaryLabel="Смотреть другие объекты"/)
  assert.doesNotMatch(propertyList, /<div className="no-results-icon">🔍<\/div>/)
})

test('search and map recover from empty results with the shared guided state', () => {
  assert.match(searchResults, /BuyerEmptyState/)
  assert.match(searchResults, /handleResetFilters/)
  assert.doesNotMatch(searchResults, /<FiAlertCircle size=\{48\}/)

  assert.match(mapPage, /BuyerEmptyState/)
  assert.match(mapPage, /setMapFilters\(EMPTY_MAP_FILTERS\)/)
  assert.match(mapPage, /setSearchQuery\(''\)/)
})
