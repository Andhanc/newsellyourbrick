import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readRepo = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

test('map engine exposes roadmap/satellite types and runtime setType', async () => {
  const [web, legacy] = await Promise.all([
    readRepo('src/utils/yandexMapEngine.js'),
    readRepo('apps/client/src/legacy/utils/yandexMapEngine.js'),
  ])
  assert.equal(legacy, web)
  assert.match(web, /export const YANDEX_MAP_TYPE_ROADMAP = 'yandex#map'/)
  assert.match(web, /export const YANDEX_MAP_TYPE_SATELLITE = 'yandex#satellite'/)
  assert.match(web, /export function toggleYandexMapType/)
  assert.match(web, /setType\(nextType\)/)
  assert.match(web, /ymap\.setType\(nextType\)/)
  assert.match(web, /pageScrollInteraction = false/)
  assert.match(web, /PAGE_SCROLL_MAP_BEHAVIORS = \[\]/)
  assert.match(web, /setPageScrollInteraction\(locked\)/)
  assert.doesNotMatch(web, /scrollElementBy/)
  assert.doesNotMatch(web, /bindPageScrollPinchZoom/)
})

test('map page stays satellite by default and offers a type switcher', async () => {
  const [page, css, legacyPage, legacyCss] = await Promise.all([
    readRepo('src/pages/MapPage.jsx'),
    readRepo('src/pages/MapPage.css'),
    readRepo('apps/client/src/legacy/pages/MapPage.jsx'),
    readRepo('apps/client/src/legacy/pages/MapPage.css'),
  ])
  assert.equal(legacyPage, page)
  assert.equal(legacyCss, css)
  assert.match(page, /useState\(YANDEX_MAP_TYPE_SATELLITE\)/)
  assert.match(page, /type: mapTypeRef\.current/)
  assert.match(page, /<MapTypeSwitcherButton/)
  assert.match(page, /className="map-type-btn"/)
  assert.match(css, /\.map-type-btn/)
  const [webBtn, legacyBtn] = await Promise.all([
    readRepo('src/components/MapTypeSwitcherButton.jsx'),
    readRepo('apps/client/src/legacy/components/MapTypeSwitcherButton.jsx'),
  ])
  assert.equal(legacyBtn, webBtn)
  assert.match(webBtn, /mapTypeShowMap/)
  assert.match(webBtn, /mapTypeShowSatellite/)
  assert.match(webBtn, /onOverlayOpen/)
  assert.match(webBtn, /opensOverlay/)
})

test('property map shows the switcher, add-property keeps the roadmap default without it', async () => {
  const [locationMap, propertyMap, addProperty, ownerAdd, legacyLocation, legacyProperty] = await Promise.all([
    readRepo('src/components/LocationMap.jsx'),
    readRepo('src/components/PropertyDetailLocationMap.jsx'),
    readRepo('src/pages/AddProperty.jsx'),
    readRepo('src/pages/OwnerAddPropertyLocationStep.jsx'),
    readRepo('apps/client/src/legacy/components/LocationMap.jsx'),
    readRepo('apps/client/src/legacy/components/PropertyDetailLocationMap.jsx'),
  ])
  assert.equal(legacyLocation, locationMap)
  assert.equal(legacyProperty, propertyMap)
  assert.match(locationMap, /mapType = YANDEX_MAP_TYPE_ROADMAP/)
  assert.match(locationMap, /showMapTypeSwitcher = false/)
  assert.match(propertyMap, /showMapTypeSwitcher/)
  assert.match(propertyMap, /onSatelliteOpen/)
  assert.match(propertyMap, /mode="satellite"/)
  assert.match(locationMap, /pageScrollInteraction = false/)
  assert.match(locationMap, /pageScrollInteraction && !isFullscreen/)
  assert.match(propertyMap, /pageScrollInteraction/)
  assert.doesNotMatch(addProperty, /pageScrollInteraction/)
  assert.doesNotMatch(addProperty, /showMapTypeSwitcher/)
  assert.doesNotMatch(ownerAdd, /showMapTypeSwitcher/)

  const [locationCss, legacyLocationCss] = await Promise.all([
    readRepo('src/components/LocationMap.css'),
    readRepo('apps/client/src/legacy/components/LocationMap.css'),
  ])
  assert.equal(legacyLocationCss, locationCss)
  assert.match(locationMap, /location-map-container--page-scroll/)
  assert.match(locationMap, /pinchDistance/)
  assert.match(locationCss, /pointer-events: none !important/)
  assert.match(locationCss, /touch-action: pan-y !important/)
})
