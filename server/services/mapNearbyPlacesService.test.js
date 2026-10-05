import test from 'node:test'
import assert from 'node:assert/strict'
import { createNearbyPlacesService } from './mapNearbyPlacesService.js'

const response = (elements, extra = {}) => ({ ok: true, json: async () => ({ elements, ...extra }) })
const school = { type: 'way', id: 1, center: { lat: 53.9001, lon: 27.56 }, tags: { name: 'School' } }
const stalled = (_url, { signal }) => new Promise((_, reject) => {
  signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })
})

test('search covers buildings, territories and transit platforms; sorts nearest before limiting', async () => {
  const queries = []
  const fetchCategory = createNearbyPlacesService({ fetchImpl: async (_url, options) => {
    queries.push(new URLSearchParams(options.body).get('data'))
    return response([
      ...Array.from({ length: 30 }, (_, i) => ({ type: 'node', id: i, lat: 53.91 + i / 1000, lon: 27.56 })),
      school, school,
      { type: 'relation', id: 9, center: { lat: 53.9002, lon: 27.56 }, tags: { name: 'Campus' } },
      { type: 'node', id: 100, lat: null, lon: 27.56 },
    ])
  } })
  const places = await fetchCategory(53.9, 27.56, 'schools')
  assert.equal(places.length, 25)
  assert.equal(places[0].id, 'way/1')
  assert.equal(places[1].id, 'relation/9')
  assert.equal(places.filter(p => p.id === 'way/1').length, 1)
  for (const category of ['transport', 'medical', 'recreation', 'shops']) await fetchCategory(53.9, 27.56, category)
  for (const query of queries) {
    assert.match(query, /nwr\[/)
    assert.match(query, /out body center;/)
    assert.doesNotMatch(query, /out body 25/)
  }
  assert.match(queries[1], /platform/)
  assert.match(queries[1], /tram_stop/)
})

test('concurrent requests share one lookup, radius is part of the cache key', async () => {
  let calls = 0
  const fetchCategory = createNearbyPlacesService({ fetchImpl: async () => { calls++; return response([school]) } })
  const results = await Promise.all(Array.from({ length: 8 }, () => fetchCategory(53.9, 27.56, 'schools')))
  assert.equal(calls, 1)
  assert.deepEqual(results[0], results[7])
  await fetchCategory(53.9, 27.56, 'schools')
  assert.equal(calls, 1)
  await fetchCategory(53.9, 27.56, 'schools', 2500)
  assert.equal(calls, 2)
})

test('a slow primary does not delay a healthy backup, and the losing request is aborted', async () => {
  let calls = 0
  let primarySignal
  const fetchCategory = createNearbyPlacesService({ hedgeDelayMs: 5, timeoutMs: 150, fetchImpl: (url, options) => {
    calls++
    if (calls === 1) { primarySignal = options.signal; return stalled(url, options) }
    return response([school])
  } })
  const places = await fetchCategory(53.9, 27.56, 'schools')
  assert.equal(places.length, 1)
  assert.equal(calls, 2)
  assert.equal(primarySignal.aborted, true)
})

test('all stalled providers hit one deadline, without extra retries; next click can retry', async () => {
  let calls = 0
  const signals = []
  const fetchCategory = createNearbyPlacesService({ hedgeDelayMs: 5, timeoutMs: 20, fetchImpl: (url, options) => {
    calls++; signals.push(options.signal); return stalled(url, options)
  } })
  await assert.rejects(fetchCategory(53.9, 27.56, 'schools'), /timed out/)
  assert.equal(calls, 2)
  assert.ok(signals.every(signal => signal.aborted))
  await assert.rejects(fetchCategory(53.9, 27.56, 'schools'))
  assert.equal(calls, 4)
})

test('HTTP 200 with an Overpass error remark is not cached as an empty success', async () => {
  let broken = true
  let calls = 0
  const fetchCategory = createNearbyPlacesService({ fetchImpl: async () => {
    calls++
    return broken ? response([], { remark: 'runtime error: Query timed out' }) : response([school])
  } })
  await assert.rejects(fetchCategory(53.9, 27.56, 'schools'))
  assert.equal(calls, 2)
  broken = false
  assert.equal((await fetchCategory(53.9, 27.56, 'schools')).length, 1)
  assert.equal(calls, 3)
})

test('empty results expire quickly, successful results expire after an hour', async () => {
  let clock = 0
  let calls = 0
  let elements = []
  const fetchCategory = createNearbyPlacesService({ now: () => clock, fetchImpl: async () => { calls++; return response(elements) } })
  await fetchCategory(53.9, 27.56, 'schools')
  clock = 59_000
  await fetchCategory(53.9, 27.56, 'schools')
  assert.equal(calls, 1)
  clock = 61_000
  elements = [school]
  assert.equal((await fetchCategory(53.9, 27.56, 'schools')).length, 1)
  clock += 3_600_001
  await fetchCategory(53.9, 27.56, 'schools')
  assert.equal(calls, 3)
})

test('invalid coordinates and radius cannot reach Overpass', async () => {
  const fetchCategory = createNearbyPlacesService({ fetchImpl: () => assert.fail('must not request') })
  await assert.rejects(fetchCategory(Infinity, 0, 'schools'), /Invalid/)
  await assert.rejects(fetchCategory(53.9, 27.56, 'schools', 5001), /Invalid/)
})
