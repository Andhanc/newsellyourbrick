import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildHeroSearchNavigation } from '../../utils/heroSearchFilters.js'

const jsx = await readFile(new URL('./HomeRedesignPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeRedesignPage.css', import.meta.url), 'utf8')
test('renders a compact mobile catalog action and an accessible filters drawer', () => {
  assert.match(jsx, /hr-search-bar--mobile/)
  assert.match(jsx, /placeholder="Поиск по каталогу"/)
  assert.match(jsx, /readOnly/)
  assert.match(jsx, /Найдём всё!/)
  assert.match(jsx, /aria-expanded=\{mobileFiltersOpen\}/)
  assert.match(jsx, /aria-controls="hr-search-mobile-drawer"/)
  assert.match(jsx, /id="hr-search-mobile-drawer"/)
  assert.match(jsx, />Найти</)
})

test('switches from desktop search to an animated inline drawer on narrow screens', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))

  assert.match(css, /\.hr-search-bar--mobile\s*\{[\s\S]*?display:\s*none/)
  assert.match(mobile, /\.hr-search-bar--desktop\s*\{[\s\S]*?display:\s*none/)
  assert.match(mobile, /\.hr-search-bar--mobile\s*\{[\s\S]*?display:\s*block/)
  assert.match(mobile, /\.hr-search-mobile__drawer\s*\{[\s\S]*?grid-template-rows:\s*0fr/)
  assert.match(mobile, /\.hr-search-mobile__drawer\.is-open\s*\{[\s\S]*?grid-template-rows:\s*1fr/)
  assert.match(mobile, /\.hr-search-mobile__fields\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
})

test('empty mobile filters navigate to the full catalog', () => {
  const target = buildHeroSearchNavigation({
    saleType: '',
    propertyType: '',
    location: '',
    price: '',
  })

  assert.equal(target.pathname, '/search-results')
  assert.deepEqual(target.state.heroSearchFilters, {
    country: '',
    propertyType: '',
    purchaseTypes: [],
    minPrice: '',
    maxPrice: '',
  })
})
