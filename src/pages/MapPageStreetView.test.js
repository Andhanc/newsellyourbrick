import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const locales = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']

test('map property hint reuses the property Street View drawer and keeps web/legacy parity', async () => {
  const [webPage, legacyPage, webCss, legacyCss] = await Promise.all([
    readFile(new URL('./MapPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/client/src/legacy/pages/MapPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./MapPage.css', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/client/src/legacy/pages/MapPage.css', import.meta.url), 'utf8'),
  ])

  assert.equal(legacyPage, webPage)
  assert.equal(legacyCss, webCss)
  assert.match(webPage, /import PropertyStreetViewDrawer from '..\/components\/PropertyStreetViewDrawer'/)
  assert.match(webPage, /const \[streetViewProperty, setStreetViewProperty\] = useState\(null\)/)
  assert.match(webPage, /onClick=\{\(\) => setStreetViewProperty\(mapOpenHintProperty\)\}/)
  assert.match(webPage, /<PropertyStreetViewDrawer[\s\S]*isOpen=\{Boolean\(streetViewProperty\)\}[\s\S]*center=\{getPropertyCoordinates\(streetViewProperty\)\}/)
  assert.match(webPage, /<MdDirectionsWalk size=\{21\}/)
  assert.match(webPage, /t\('mapPage_streetView'\)/)
  assert.match(webCss, /\.map-open-hint__actions\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(webCss, /\.map-open-hint__action--street-view\s*\{[\s\S]*background:\s*#edf7f6/)
})
test('map Street View action is translated in every supported locale and mirror', async () => {
  for (const locale of locales) {
    const [web, legacy] = await Promise.all([
      readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
      readFile(new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
    ])
    const webMessages = JSON.parse(web)
    const legacyMessages = JSON.parse(legacy)

    assert.equal(legacyMessages.mapPage_streetView, webMessages.mapPage_streetView)
    assert.ok(webMessages.mapPage_streetView)
  }
})
