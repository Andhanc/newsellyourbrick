import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try {
    return await readFile(url, 'utf8')
  } catch {
    return ''
  }
}

const source = await readOrEmpty(new URL('./CompareMobileMetrics.jsx', import.meta.url))
const css = await readOrEmpty(new URL('./CompareMobileMetrics.css', import.meta.url))

test('mobile comparison keeps both object identities visible', () => {
  assert.match(source, /compare-mobile__pair/)
  assert.match(source, /compare-mobile__object-image/)
  assert.match(source, /Объект 1/)
  assert.match(source, /Объект 2/)
  assert.match(source, /onReplace\('left'\)/)
  assert.match(source, /onReplace\('right'\)/)
})

test('mobile comparison renders semantic metric cards instead of a table', () => {
  assert.match(source, /rows\.map/)
  assert.match(source, /compare-mobile__metric/)
  assert.match(source, /compare-mobile__metric-label/)
  assert.match(source, /compare-mobile__value--win/)
  assert.match(source, /Сильнее/)
  assert.doesNotMatch(source, /<table/)
})

test('mobile comparison has no horizontal scroll and uses readable buyer tokens', () => {
  assert.match(css, /overflow-x:\s*clip/)
  assert.match(css, /position:\s*sticky/)
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /min-height:\s*var\(--buyer-touch\)/)
  assert.match(css, /\.compare-mobile__value--win[\s\S]*var\(--buyer-mint\)/)
  assert.match(css, /@media\s*\(max-width:\s*360px\)/)
})
