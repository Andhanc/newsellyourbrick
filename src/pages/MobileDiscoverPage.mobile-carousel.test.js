import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const jsx = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('feature cards retain the four approved destinations after upstream strategy updates', () => {
  const start = jsx.indexOf('function getSaleCards(t)')
  const end = jsx.indexOf('function prefersReducedMotion()', start)
  const cards = new Function('t', 'publicAsset', 'TEST_DRIVE_PATH', `${jsx.slice(start, end)}; return getSaleCards(t)`)(key => key, path => path, '/test-drive')
  assert.deepEqual(cards.map(card => card.id), ['map', 'investor', 'vip', 'test_drive'])
  assert.deepEqual(cards.map(card => card.to), ['/map', '/calculator', '/private-club', '/test-drive'])
  assert.ok(cards.every(card => card.featureTitle && card.iconSrc))
})

test('launch offers five working destinations with existing property photography', () => {
  for (const route of ["'/auction?filter=auction'", "'/auction/buy-now'", "'/debts'", 'CO_INVESTMENT_PATH', "'/development'"]) {
    assert.ok(jsx.includes(`to: ${route}`), route)
  }
  for (const name of ['marbella', 'nice', 'paphos', 'sorrento', 'barcelona', 'santorini']) {
    assert.ok(existsSync(new URL(`../../public/images/test-drive/property-${name}.png`, import.meta.url)), name)
  }
  assert.match(jsx, /launchCards\.map\(\(card, index\) =>[\s\S]*to=\{card\.to\}/)
  assert.match(jsx, /card\.photos\.map/)
})

test('launch shows larger cards in a swipeable five-card rail, with a code wave and the search below', () => {
  assert.match(css, /\.md-launch__slider\s*\{[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory/s)
  assert.match(css, /\.md-launch__item\s*\{[^}]*flex: 0 0 calc\(\(100% - 16px\) \/ 2\.75\)/s)
  assert.match(css, /\.md-launch__photos img\s*\{[^}]*border-radius: 50%/s)
  assert.match(jsx, /SellYouBrick[\s\S]*md-launch__headline[\s\S]*md-launch__slider[\s\S]*md-launch__wave[\s\S]*md-stage__sheet[\s\S]*role="search"/)
  assert.doesNotMatch(jsx, /SEARCH_BACKDROP/)
  assert.match(jsx, /md-welcome__copy[\s\S]*md-welcome__media[\s\S]*md-rewards__tiles[\s\S]*<MobileDiscoverCatalog/)
})
