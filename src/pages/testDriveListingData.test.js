import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  isWithinSelectedTestDrivePrice,
  mapRealTestDriveListing,
  matchesSelectedTestDriveType,
  realTestDriveListings,
} from './testDriveListingData.js'

test('maps real property fields and test-drive daily price without demo substitutions', () => {
  const property = {
    id: 91,
    title: 'Casa Verde',
    location: 'Adeje, Tenerife',
    city: 'Adeje',
    property_type: 'villa',
    bedrooms: 4,
    bathrooms: 3,
    area: 240,
    price: 850000,
    test_drive_data: JSON.stringify({ price_per_day: 375 }),
  }

  const listing = mapRealTestDriveListing(property, 0, {
    id: 'houses:91',
    image: '/uploads/casa-verde.jpg',
  })

  assert.equal(listing.title, 'Casa Verde')
  assert.equal(listing.location, 'Adeje, Tenerife')
  assert.equal(listing.city, 'Adeje')
  assert.equal(listing.type, 'villa')
  assert.equal(listing.bedrooms, 4)
  assert.equal(listing.bathrooms, 3)
  assert.equal(listing.area, 240)
  assert.equal(listing.price, 375)
  assert.equal(listing.image, '/uploads/casa-verde.jpg')
  assert.equal(listing.originalProperty, property)
  assert.equal(listing.rating, 4.6)
  assert.equal(listing.reviews, 14)
})

test('returns only mapped API records and never pads with demo listings', () => {
  const mapped = realTestDriveListings([{ id: 1 }, { id: 2 }], (property) => ({ id: property.id }))

  assert.deepEqual(mapped, [{ id: 1 }, { id: 2 }])
  assert.deepEqual(realTestDriveListings([], () => ({ id: 'demo' })), [])
})

test('matches Russian type filters against real API property types', () => {
  assert.equal(matchesSelectedTestDriveType('villa', ['Вилла']), true)
  assert.equal(matchesSelectedTestDriveType('apartment', ['Апартаменты']), true)
  assert.equal(matchesSelectedTestDriveType('commercial', ['Апартаменты']), true)
  assert.equal(matchesSelectedTestDriveType('house', ['Вилла']), false)
  assert.equal(matchesSelectedTestDriveType('commercial', []), true)
})

test('treats the default €500+ price position as unbounded', () => {
  assert.equal(isWithinSelectedTestDrivePrice(900, 500), true)
  assert.equal(isWithinSelectedTestDrivePrice(250, 300), true)
  assert.equal(isWithinSelectedTestDrivePrice(450, 300), false)
})

test('test-drive page does not declare or render generated demo listings', async () => {
  const pageSource = await readFile(new URL('./TestDriveLandingPage.jsx', import.meta.url), 'utf8')

  assert.doesNotMatch(pageSource, /GENERATED_LISTINGS|BASE_LISTINGS|CARD_IMAGES/)
  assert.match(pageSource, /realTestDriveListings\(apiListings/)
  assert.match(pageSource, /\{loading \? null : filteredListings\.length === 0 \? \(/)
})
