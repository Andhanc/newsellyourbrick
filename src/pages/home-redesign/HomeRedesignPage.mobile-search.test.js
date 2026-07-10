import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeRedesignPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeRedesignPage.css', import.meta.url), 'utf8')
const filters = await readFile(new URL('../../utils/heroSearchFilters.js', import.meta.url), 'utf8')

test('uses compact hero search labels for narrow screens', () => {
  assert.match(jsx, /hr-search-bar__value--compact/)
  assert.match(filters, /shortLabel:\s*'50–250K'/)
  assert.match(filters, /shortLabel:\s*'Сейчас'/)
})

test('keeps hero search filters in one mobile row', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))

  assert.match(mobile, /\.hr-search-bar\s*\{[\s\S]*?flex-direction:\s*row/)
  assert.match(mobile, /\.hr-search-bar__fields\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(mobile, /\.hr-search-bar__label[\s\S]*?display:\s*none/)
  assert.match(mobile, /\.hr-search-bar__value--compact[\s\S]*?display:\s*block/)
  assert.match(mobile, /\.hr-search-bar__submit[\s\S]*?width:\s*44px/)
})
