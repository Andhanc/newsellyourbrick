import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createNearbyPlacesClient } from './mapNearbyPlaces.js'

const places = [{ id: 'way/1', name: 'School', lat: 53.9, lng: 27.56, category: 'schools' }]
const response = (data = places) => ({ ok: true, json: async () => ({ success: true, data: { places: data } }) })

test('concurrent clicks and repeat visits reuse one request; radius reaches API and cache key', async () => {
  const urls = []
  const load = createNearbyPlacesClient({ fetchImpl: async url => { urls.push(url); return response() } })
  const results = await Promise.all(Array.from({ length: 6 }, () => load(53.9, 27.56, 'schools')))
  assert.deepEqual(results[0], places)
  assert.equal(urls.length, 1)
  await load(53.9, 27.56, 'schools')
  assert.equal(urls.length, 1)
  await load(53.9, 27.56, 'schools', 2500)
  assert.equal(urls.length, 2)
  assert.match(urls[1], /radius=2500/)
})

test('slow response bodies time out and abort; no direct browser fallback or automatic retries', async () => {
  let calls = 0
  let signal
  const load = createNearbyPlacesClient({ timeoutMs: 10, fetchImpl: async (_url, options) => {
    calls++; signal = options.signal
    return { ok: true, json: () => new Promise(() => {}) }
  } })
  await assert.rejects(load(53.9, 27.56, 'schools'), /timed out/)
  assert.equal(signal.aborted, true)
  assert.equal(calls, 1)
  await assert.rejects(load(53.9, 27.56, 'schools'), /timed out/)
  assert.equal(calls, 2)
})

test('API errors and malformed payloads remain retryable, not cached as no places', async () => {
  for (const bad of [{ ok: false, status: 502 }, { ok: true, json: async () => ({ success: true }) }]) {
    let calls = 0
    const load = createNearbyPlacesClient({ fetchImpl: async () => ++calls === 1 ? bad : response() })
    await assert.rejects(load(53.9, 27.56, 'schools'))
    assert.deepEqual(await load(53.9, 27.56, 'schools'), places)
    assert.equal(calls, 2)
  }
})

test('empty client cache expires in a minute and populated cache in an hour', async () => {
  let clock = 0
  let calls = 0
  const load = createNearbyPlacesClient({ now: () => clock, fetchImpl: async () => response(++calls === 1 ? [] : places) })
  assert.deepEqual(await load(53.9, 27.56, 'schools'), [])
  clock = 59_000
  assert.deepEqual(await load(53.9, 27.56, 'schools'), [])
  assert.equal(calls, 1)
  clock = 61_000
  assert.deepEqual(await load(53.9, 27.56, 'schools'), places)
  clock += 3_600_001
  await load(53.9, 27.56, 'schools')
  assert.equal(calls, 3)
})

test('invalid input never sends a request', async () => {
  const load = createNearbyPlacesClient({ fetchImpl: () => assert.fail('must not request') })
  await assert.rejects(load(NaN, 27.56, 'schools'), /Invalid/)
  await assert.rejects(load(53.9, 27.56, 'schools', 99999), /Invalid/)
})

test('web and legacy use identical nearby fetching, and all status translations exist', async () => {
  for (const file of ['utils/mapNearbyPlaces.js', 'components/PropertyDetailLocationMap.jsx']) {
    const web = await readFile(new URL(`../../src/${file}`, import.meta.url), 'utf8')
    const legacy = await readFile(new URL(`../../apps/client/src/legacy/${file}`, import.meta.url), 'utf8')
    assert.equal(web, legacy)
  }
  for (const locale of ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']) {
    const web = JSON.parse(await readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'))
    const legacy = JSON.parse(await readFile(new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'))
    for (const suffix of ['Loading', 'Error', 'Empty', 'Found']) {
      const key = `propertyDetailMapPlaces${suffix}`
      assert.ok(web[key])
      assert.equal(web[key], legacy[key])
    }
  }
})
