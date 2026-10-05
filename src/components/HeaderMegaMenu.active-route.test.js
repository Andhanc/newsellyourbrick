import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { CO_INVESTMENT_PATH } from '../utils/sectionPaths.js'

const sources = await Promise.all([
  new URL('./HeaderMegaMenu.jsx', import.meta.url),
  new URL('../../apps/client/src/legacy/components/HeaderMegaMenu.jsx', import.meta.url),
].map((url) => readFile(url, 'utf8')))

const matchers = sources.map((source) => source.slice(
  source.indexOf('function matchesMenuPath('),
  source.indexOf('\nfunction getInitialOpenSections('),
))

test('web and legacy menus use the same active-route matching', () => {
  assert.equal(matchers[0], matchers[1])
})

for (const [index, source] of matchers.entries()) {
  const matchesMenuPath = runInNewContext(`(${source})`, { URLSearchParams, CO_INVESTMENT_PATH })
  const variant = index === 0 ? 'web' : 'legacy'

  test(`${variant}: buy-now pages highlight only Buy now`, () => {
    for (const pathname of ['/auction/buy-now', '/auction/buy-now/', '/auction/buy-now/villa-123']) {
      assert.equal(matchesMenuPath(pathname, '?sort=price', '/auction'), false, pathname)
      assert.equal(matchesMenuPath(pathname, '?sort=price', '/auction/buy-now'), true, pathname)
    }
  })

  test(`${variant}: auction catalogue and property routes keep Auction active`, () => {
    for (const pathname of ['/auction', '/auction/', '/auction/spain/tenerife', '/auction/property/villa-123', '/auction/spain/tenerife/property/villa-123']) {
      assert.equal(matchesMenuPath(pathname, '', '/auction'), true, pathname)
      assert.equal(matchesMenuPath(pathname, '', '/auction/buy-now'), false, pathname)
    }
    assert.equal(matchesMenuPath('/auctioneer', '', '/auction'), false)
  })
}
