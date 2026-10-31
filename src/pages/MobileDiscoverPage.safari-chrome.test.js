import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')
const legacyPage = await readFile(
  new URL('../../apps/client/src/legacy/pages/MobileDiscoverPage.jsx', import.meta.url),
  'utf8',
)
const legacyCss = await readFile(
  new URL('../../apps/client/src/legacy/pages/MobileDiscoverPage.css', import.meta.url),
  'utf8',
)

test('hero keeps iPhone Safari chrome transparent instead of a solid lawn plate', () => {
  assert.match(page, /md-hero-chrome/)
  assert.match(page, /md-hero__safari-clear/)
  assert.match(page, /paintTheme\(immersive \? 'transparent'/)
  assert.doesNotMatch(page, /#748f1d/)
  assert.doesNotMatch(page, /md-hero__safari-tint/)
  assert.match(css, /html\.md-hero-chrome/)
  assert.doesNotMatch(page, /pinScroll|readRunway|window\.scrollTo/)
  assert.doesNotMatch(css, /--md-safari-runway/)
  assert.match(css, /\.md-hero__safari-clear\s*\{/)
  assert.doesNotMatch(css, /#748f1d/)
  assert.doesNotMatch(css, /\.md-hero__safari-tint/)
})

test('web and legacy MobileDiscover Safari chrome stay in parity', () => {
  for (const needle of ['md-hero-chrome', 'md-hero__safari-clear', "immersive ? 'transparent'"]) {
    assert.match(page, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(legacyPage, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.doesNotMatch(legacyPage, /#748f1d/)
  assert.match(legacyCss, /html\.md-hero-chrome/)
  assert.doesNotMatch(legacyCss, /--md-safari-runway/)
  assert.equal(page, legacyPage)
  assert.equal(css, legacyCss)
  assert.match(legacyCss, /\.md-hero__safari-clear\s*\{/)
  assert.doesNotMatch(legacyCss, /#748f1d/)
})
