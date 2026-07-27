import test from 'node:test'
import assert from 'node:assert/strict'

import {
  enrichPropertyAiNeighborhood,
  parsePropertyCoordinates,
} from './propertyAiNeighborhood.js'

test('parses listing coordinates from supported database shapes', () => {
  assert.deepEqual(parsePropertyCoordinates('[53.8649,27.5550]'), { lat: 53.8649, lng: 27.555 })
  assert.deepEqual(parsePropertyCoordinates('53.8649, 27.5550'), { lat: 53.8649, lng: 27.555 })
  assert.deepEqual(parsePropertyCoordinates({ lat: 53.8649, lng: 27.555 }), { lat: 53.8649, lng: 27.555 })
  assert.equal(parsePropertyCoordinates('unknown'), null)
})

test('enriches a property with verified nearby places and distances', async () => {
  const result = await enrichPropertyAiNeighborhood({
    coordinates: '[53.8649,27.5550]',
  }, {
    fetchCategory: async (_lat, _lng, category) => [{
      id: `${category}-1`,
      name: `${category} place`,
      lat: 53.866,
      lng: 27.556,
      category,
    }],
    timeoutMs: 100,
  })

  assert.equal(result.nearbyInfrastructure.length, 5)
  assert.equal(result.nearbyInfrastructure[0].places[0].source, 'OpenStreetMap')
  assert.ok(result.nearbyInfrastructure[0].places[0].distanceMeters > 0)
})
