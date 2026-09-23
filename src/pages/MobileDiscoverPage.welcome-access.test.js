import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'esbuild'

const page = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const navStart = page.indexOf('<nav className="md-welcome__shortcuts"')
const nav = page.slice(navStart, page.indexOf('</nav>', navStart) + '</nav>'.length)
const renderCode = transformSync(`function render() { return (${nav}) }`, { loader: 'jsx' }).code
const shortcuts = [
  { id: 'map', path: '/map' },
  { id: 'deposit', path: '/deposit' },
  { id: 'favorites', path: '/favorites' },
]

// Render the actual page markup in isolation, without starting catalog/API requests.
function renderShortcuts(unlocked, locale = 'ru') {
  const strings = JSON.parse(readFileSync(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url)))
  const t = (key) => key.split('.').reduce((value, part) => value?.[part], strings)
  const render = new Function('React', 'Link', 'WELCOME_SHORTCUTS', 'welcomeShortcutAsset', 't',
    'shortcutsUnlocked', 'handleWelcomeShortcutClick', 'FiArrowUpRight', 'WELCOME_LOCK_IMAGE', `${renderCode}; return render()`)
  return renderToStaticMarkup(render(React,
    ({ to, ...props }) => React.createElement('a', { ...props, href: to }),
    shortcuts, (id) => `/images/mobile-showcase/glass/${id}.webp`, t, unlocked, () => {},
    (props) => React.createElement('svg', props), '/images/property-detail/deposit-lock-gate-clay-3d-clean.png'))
}

test('guests see three locked shortcuts with readable localized login labels', () => {
  for (const locale of ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']) {
    const html = renderShortcuts(false, locale)
    assert.equal((html.match(/ is-locked/g) || []).length, 3)
    assert.equal((html.match(/md-welcome__shortcut-lock/g) || []).length, 3)
    assert.doesNotMatch(html, /md-welcome__shortcut-arrow|undefined/)
    assert.equal((html.match(/<h3>/g) || []).length, 3)
  }
})

test('signed-in shortcuts show artwork and arrows and retain all three destinations', () => {
  const html = renderShortcuts(true)
  assert.doesNotMatch(html, /is-locked|md-welcome__shortcut-lock/)
  assert.equal((html.match(/md-welcome__shortcut-arrow/g) || []).length, 3)
  for (const { id, path } of shortcuts) {
    assert.ok(html.includes(`href="${path}"`))
    assert.ok(html.includes(`/images/mobile-showcase/glass/${id}.webp`))
  }
})

test('a guest click opens login while an authenticated click keeps normal navigation', () => {
  const handlerSource = page.match(/const handleWelcomeShortcutClick = (\(event\) => \{[\s\S]*?\n  \})/)[1]
  for (const signedIn of [false, true]) {
    let prevented = false
    const requests = []
    const handler = new Function('isSiteUserSignedIn', 'requestOpenLoginModal', 'user', 'userLoaded',
      `return ${handlerSource}`)(() => signedIn, (options) => requests.push(options), null, true)
    handler({ preventDefault: () => { prevented = true } })
    assert.equal(prevented, !signedIn)
    assert.deepEqual(requests, signedIn ? [] : [{ wizard: true }])
  }
})

test('welcome implementation and generated assets match the client mirror', () => {
  for (const extension of ['jsx', 'css']) {
    const name = `MobileDiscoverPage.${extension}`
    assert.equal(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'),
      readFileSync(new URL(`../../apps/client/src/legacy/pages/${name}`, import.meta.url), 'utf8'))
  }
  for (const { id } of shortcuts) {
    const path = `public/images/mobile-showcase/glass/${id}.webp`
    assert.deepEqual(readFileSync(new URL(`../../${path}`, import.meta.url)),
      readFileSync(new URL(`../../apps/client/${path}`, import.meta.url)))
  }
})
