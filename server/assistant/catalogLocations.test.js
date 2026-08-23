import test from 'node:test'
import assert from 'node:assert/strict'
import {
  citiesForCountry,
  detectCatalogCity,
  detectCatalogCountry,
  detectCatalogLocation,
  indexCatalogLocations,
  parseLocationParts,
} from './catalogLocations.js'

test('parses country and city from a live site address', () => {
  const parsed = parseLocationParts({
    location: 'Беларусь, Минск, улица Киселёва, 18',
  })
  assert.equal(parsed.country, 'Беларусь')
  assert.equal(parsed.city, 'Минск')
})

test('keeps country to city hierarchy', () => {
  const index = indexCatalogLocations([
    { id: 1, location: 'Беларусь, Минск' },
    { id: 2, location: 'Беларусь, Гомель' },
    { id: 3, location: 'Spain, Barcelona' },
  ])
  const country = detectCatalogCountry('Беларусь', index)
  assert.equal(country.countryKey, 'беларусь')
  assert.deepEqual(
    citiesForCountry(index, country.countryKey).map((city) => city.label).sort(),
    ['Гомель', 'Минск'],
  )
  assert.equal(detectCatalogCity('Минск', index, country.countryKey).cityLabel, 'Минск')
  assert.equal(detectCatalogCity('Barcelona', index, country.countryKey).hasCity, false)
})

test('indexes only locations that exist on listings', () => {
  const index = indexCatalogLocations([
    { id: 1, location: 'Беларусь, Минск, улица Киселёва, 18' },
    { id: 2, location: 'Беларусь, Минск, улица Немига, 3' },
    { id: 3, location: 'Беларусь, Минск, улица Уборевича, 66 к1' },
  ])
  assert.ok(index.labels.includes('Минск'))
  assert.ok(index.labels.includes('Беларусь'))
  assert.ok(!index.labels.includes('Мадрид'))
  assert.ok(!index.labels.includes('Дубай'))
  assert.ok(!index.buttonLabels.includes('Мадрид'))
  assert.ok(!index.buttonLabels.includes('Дубай'))
})

test('does not put a single Madrid listing on location buttons', () => {
  const index = indexCatalogLocations([
    { id: 1, location: 'Беларусь, Минск' },
    { id: 2, location: 'Беларусь, Минск' },
    { id: 3, location: 'Беларусь, Минск' },
    { id: 19, location: 'Spain, Madrid' },
    { id: 20, location: 'Spain, Barcelona' },
  ])
  assert.ok(index.buttonLabels.includes('Минск'))
  assert.ok(!index.buttonLabels.includes('Мадрид'))
  assert.ok(!index.buttonLabels.includes('Барселона'))
  assert.ok(!index.buttonLabels.includes('Испания'))
})

test('does not treat Dubai or Madrid as available if they are not in the catalog', () => {
  const index = indexCatalogLocations([
    { id: 1, location: 'Беларусь, Минск, улица Киселёва, 18' },
    { id: 2, location: 'Беларусь, Минск, улица Киселёва, 55' },
  ])
  const dubai = detectCatalogLocation('хочу квартиру в Дубае', index)
  assert.equal(dubai.hasLocation, false)
  assert.equal(dubai.unknownLabel, 'Дубай')
  const madrid = detectCatalogLocation('есть что-то в Мадриде?', index)
  assert.equal(madrid.hasLocation, false)
  assert.equal(madrid.unknownLabel, 'Мадрид')
})
