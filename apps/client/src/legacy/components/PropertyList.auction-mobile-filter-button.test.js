import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./PropertyList.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PropertyList.css', import.meta.url), 'utf8')

test('auction mobile filter trigger matches the Shares trigger', () => {
  assert.match(component, /import \{ FiSliders \} from 'react-icons\/fi'/)
  assert.match(component, /isAuctionMobileFilters \? <FiSliders size=\{18\} aria-hidden \/>/)
  assert.match(component, /className="filters-button__dot"/)
  assert.doesNotMatch(component, /className="filters-badge"/)

  assert.match(
    css,
    /\.search-filters-bar\.search-filters-bar--auction-mobile \.filters-button\s*\{[\s\S]*?min-width:\s*48px[\s\S]*?min-height:\s*48px[\s\S]*?padding:\s*0 14px/,
  )
  assert.match(
    css,
    /\.search-filters-bar\.search-filters-bar--auction-mobile \.filters-button__dot\s*\{[\s\S]*?width:\s*8px[\s\S]*?height:\s*8px[\s\S]*?background:\s*#0099A9/,
  )
})
