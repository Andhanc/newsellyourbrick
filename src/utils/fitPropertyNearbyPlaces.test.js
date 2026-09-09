import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fitPropertyNearbyPlaces } from './fitPropertyNearbyPlaces.js'

function createMap(zoom = 17) {
  return {
    calls: [],
    resize() { this.resized = true },
    getZoom: () => zoom,
    getContainer: () => ({ getBoundingClientRect: () => ({
      top: 100, bottom: 685, left: 0, right: 390, width: 390, height: 585,
    }) }),
    fitBounds(bounds, options) { this.calls.push({ bounds, options }) },
  }
}

const property = { lat: 28.2, lng: -16.8 }
const places = [{ lat: 28.21, lng: -16.82 }, { lat: 28.19, lng: -16.81 }]

test('frames all POIs and the property, leaving space above overlaid cards', () => {
  const map = createMap()
  fitPropertyNearbyPlaces(map, property, places, {
    getBoundingClientRect: () => ({ top: 505, bottom: 670, left: 0, right: 390 }),
  })
  assert.ok(map.resized)
  assert.deepEqual(map.calls[0].bounds, [[-16.82, 28.19], [-16.8, 28.21]])
  assert.equal(map.calls[0].options.padding.bottom, 212)
  assert.equal(map.calls[0].options.maxZoom, 14)
})

test('filters outside the map do not consume its viewport; an overview never zooms in', () => {
  const map = createMap(11)
  fitPropertyNearbyPlaces(map, property, places, {
    getBoundingClientRect: () => ({ top: 700, bottom: 750, left: 0, right: 390 }),
  })
  assert.equal(map.calls[0].options.padding.bottom, 48)
  assert.equal(map.calls[0].options.maxZoom, 11)
})

test('no results leave the camera unchanged and cached results can be framed again', () => {
  const map = createMap()
  fitPropertyNearbyPlaces(map, property, [])
  assert.equal(map.calls.length, 0)
  fitPropertyNearbyPlaces(map, property, places)
  fitPropertyNearbyPlaces(map, property, places)
  assert.equal(map.calls.length, 2)
  assert.deepEqual(map.calls[0], map.calls[1])
})

test('nearby map behavior and styling remain identical in web and legacy', async () => {
  for (const file of ['utils/fitPropertyNearbyPlaces.js', 'components/PropertyDetailLocationMap.jsx', 'components/PropertyDetailLocationMap.css', 'pages/PropertyDetailClassic.mobileMap.css']) {
    const [web, legacy] = await Promise.all([
      readFile(new URL(`../${file}`, import.meta.url), 'utf8'),
      readFile(new URL(`../../apps/client/src/legacy/${file}`, import.meta.url), 'utf8'),
    ])
    assert.equal(legacy, web, file)
  }
})
