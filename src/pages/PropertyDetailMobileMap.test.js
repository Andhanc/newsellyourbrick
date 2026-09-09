import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

test('mobile property map card stays mirrored and smartphone-scoped', async () => {
  const [webSource, legacySource, webCss, legacyCss] = await Promise.all([
    read('src/pages/PropertyDetailClassic.jsx'),
    read('apps/client/src/legacy/pages/PropertyDetailClassic.jsx'),
    read('src/pages/PropertyDetailClassic.mobileMap.css'),
    read('apps/client/src/legacy/pages/PropertyDetailClassic.mobileMap.css'),
  ])

  assert.equal(legacyCss, webCss)
  assert.match(webCss, /@media \(max-width: 760px\)/)
  assert.match(webCss, /\.property-detail-mobile-map-card__header/)
  assert.match(webCss, /\.property-detail-location-map__filters/)
  assert.match(webCss, /width: 100vw;/)
  assert.match(webCss, /height: clamp\(540px, 150vw, 640px\);/)
  assert.match(webCss, /position: absolute;/)
  assert.match(webCss, /scroll-snap-type: x mandatory;/)
  assert.match(webCss, /flex: 0 0 clamp\(208px, 58vw, 232px\);/)
  assert.match(webCss, /min-height: 132px;/)
  assert.doesNotMatch(webCss, /border-top: 4px|var\(--filter-color\)/)
  assert.match(webCss, /\.property-detail-location-map__filter-action/)
  assert.match(webCss, /\.location-map-controls-column__btn[\s\S]*height: 44px;/)

  for (const source of [webSource, legacySource]) {
    assert.match(source, /import '\.\/PropertyDetailClassic\.mobileMap\.css'/)
    assert.equal(
      source.match(/className="property-detail-mobile-map-card__header"/g)?.length,
      2,
    )
    assert.match(source, /t\('propertyDetailLocationTitle'\)/)
  }

  const [webMapSource, legacyMapSource] = await Promise.all([
    read('src/components/PropertyDetailLocationMap.jsx'),
    read('apps/client/src/legacy/components/PropertyDetailLocationMap.jsx'),
  ])
  assert.equal(legacyMapSource, webMapSource)
  assert.match(webMapSource, /property-detail-location-map__filter-meta/)
  assert.match(webMapSource, /t\('mapPage_showOnMap'\)/)
  assert.match(webMapSource, /<ArrowUpRight size=\{17\}/)
})
