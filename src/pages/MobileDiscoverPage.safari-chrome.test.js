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

test('hero screen drives Safari bottom chrome via md-hero-chrome + lawn tint', () => {
  assert.match(page, /md-hero-chrome/)
  assert.match(page, /md-hero__safari-tint/)
  assert.match(page, /HERO_CHROME\s*=\s*'#748f1d'/)
  assert.match(css, /html\.md-hero-chrome/)
  assert.match(css, /--md-hero-chrome:\s*#748f1d/)
  assert.match(css, /\.md-hero__safari-tint\s*\{/)
  assert.match(css, /position:\s*fixed/)
  assert.match(css, /bottom:\s*calc\(-1 \* \(var\(--md-safe-bottom\) \+ 96px\)\)/)
})

test('web and legacy MobileDiscover Safari chrome stay in parity', () => {
  for (const needle of ['md-hero-chrome', 'md-hero__safari-tint', "#748f1d"]) {
    assert.match(page, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(legacyPage, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(legacyCss, /html\.md-hero-chrome/)
  assert.match(legacyCss, /\.md-hero__safari-tint\s*\{/)
})
