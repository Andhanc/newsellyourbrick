import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildGoogleStreetViewEmbedUrl,
  normalizeStreetViewCoordinates,
} from './googleStreetView.js'

test('builds an official embedded Street View URL for the property coordinates', () => {
  const url = new URL(buildGoogleStreetViewEmbedUrl({
    center: ['28.2916', '-16.6291'],
    apiKey: 'test-key',
    language: 'ru-RU',
  }))

  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.pathname, '/maps/embed/v1/streetview')
  assert.equal(url.searchParams.get('key'), 'test-key')
  assert.equal(url.searchParams.get('location'), '28.2916,-16.6291')
  assert.equal(url.searchParams.get('language'), 'ru')
  assert.equal(url.searchParams.get('source'), 'outdoor')
  assert.equal(url.searchParams.get('radius'), '120')
})

test('builds a keyless Google Maps Street View embed fallback', () => {
  const url = new URL(buildGoogleStreetViewEmbedUrl({
    center: [28.2, -16.8],
    language: 'sv-SE',
  }))

  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.pathname, '/maps/embed')
  assert.equal(url.searchParams.get('origin'), 'mfe')
  assert.equal(url.searchParams.get('pb'), '!6m6!1m5!2m2!1d28.2!2d-16.8!4f-0!5f1')
  assert.equal(url.searchParams.get('hl'), 'sv')
})

test('rejects invalid coordinates', () => {
  assert.equal(buildGoogleStreetViewEmbedUrl({ center: [91, -16.8], apiKey: 'key' }), '')
  assert.equal(normalizeStreetViewCoordinates(['not-a-lat', -16.8]), null)
  assert.deepEqual(normalizeStreetViewCoordinates([0, 0]), { lat: 0, lng: 0 })
})

test('Street View implementation remains identical in web and legacy', async () => {
  for (const file of [
    'utils/googleStreetView.js',
    'components/PropertyStreetViewDrawer.jsx',
    'components/PropertyStreetViewDrawer.css',
  ]) {
    const [web, legacy] = await Promise.all([
      readFile(new URL(`../${file}`, import.meta.url), 'utf8'),
      readFile(new URL(`../../apps/client/src/legacy/${file}`, import.meta.url), 'utf8'),
    ])
    assert.equal(legacy, web, file)
  }
})

test('Street View opens as an interactive fullscreen portal with only its close control', async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL('../components/PropertyStreetViewDrawer.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/PropertyStreetViewDrawer.css', import.meta.url), 'utf8'),
  ])

  assert.match(component, /createPortal\(/)
  assert.doesNotMatch(component, /BuyerSheetShell/)
  assert.doesNotMatch(component, /property-street-view-drawer__header/)
  assert.match(component, /className="property-street-view-drawer__close"/)
  assert.match(component, /tabIndex=\{0\}/)
  assert.match(styles, /\.property-street-view-drawer \{[\s\S]*?inset: 0;[\s\S]*?height: 100dvh;/)
  assert.match(styles, /\.property-street-view-drawer__frame \{[\s\S]*?pointer-events: auto;[\s\S]*?touch-action: none;/)
})
