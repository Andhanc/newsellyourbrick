import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  isWithinSelectedTestDrivePrice,
  mapRealTestDriveListing,
  matchesSelectedTestDriveAmenities,
  matchesSelectedTestDriveDurations,
  matchesSelectedTestDriveType,
  paginateTestDriveListings,
  realTestDriveListings,
  sortTestDriveListings,
} from './testDriveListingData.js'

test('maps real property fields, stay bounds, rating and review count without demo substitutions', () => {
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
    average_rating: 4.8,
    reviews_count: 27,
    test_drive_data: JSON.stringify({
      price_per_day: 375,
      stay_days: 6,
      min_stay_days: 4,
      max_stay_days: 21,
    }),
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
  assert.equal(listing.rating, 4.8)
  assert.equal(listing.reviews, 27)
  assert.equal(listing.minStayDays, 4)
  assert.equal(listing.maxStayDays, 21)
  assert.equal(listing.stayDays, 6)
})

test('keeps unknown commercial fields null instead of inventing values', () => {
  const listing = mapRealTestDriveListing({ id: 8 }, 0, {
    id: 'houses:8',
    image: '/images/house.jpg',
  })

  assert.equal(listing.price, null)
  assert.equal(listing.rating, null)
  assert.equal(listing.reviews, null)
  assert.equal(listing.minStayDays, null)
  assert.equal(listing.maxStayDays, null)
  assert.equal(listing.stayDays, null)
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
  assert.equal(isWithinSelectedTestDrivePrice(null, 500), true)
  assert.equal(isWithinSelectedTestDrivePrice(250, 300), true)
  assert.equal(isWithinSelectedTestDrivePrice(450, 300), false)
  assert.equal(isWithinSelectedTestDrivePrice(null, 300), false)
})

test('duration filters use only known API stay bounds for every visible option', () => {
  const listing = { minStayDays: 4, maxStayDays: 120 }

  assert.equal(matchesSelectedTestDriveDurations(listing, []), true)
  assert.equal(matchesSelectedTestDriveDurations(listing, ['3-7 дней']), true)
  assert.equal(matchesSelectedTestDriveDurations(listing, ['1-2 недели']), true)
  assert.equal(matchesSelectedTestDriveDurations(listing, ['2-4 недели']), true)
  assert.equal(matchesSelectedTestDriveDurations(listing, ['1-3 месяца']), true)
  assert.equal(matchesSelectedTestDriveDurations(listing, ['Более 3 месяцев']), true)
  assert.equal(matchesSelectedTestDriveDurations({ minStayDays: null, maxStayDays: null }, []), true)
  assert.equal(matchesSelectedTestDriveDurations({ minStayDays: null, maxStayDays: null }, ['3-7 дней']), false)
})

test('price sorting puts known prices before request-only listings', () => {
  const listings = [
    { id: 'request', price: null },
    { id: 'high', price: 420 },
    { id: 'low', price: 180 },
  ]

  assert.deepEqual(sortTestDriveListings(listings, 'price').map((item) => item.id), ['low', 'high', 'request'])
})

test('pagination returns at most sixteen records for the active page', () => {
  const listings = Array.from({ length: 35 }, (_, index) => ({ id: index + 1 }))

  assert.deepEqual(paginateTestDriveListings(listings, 1).map((item) => item.id), Array.from({ length: 16 }, (_, index) => index + 1))
  assert.deepEqual(paginateTestDriveListings(listings, 2).map((item) => item.id), Array.from({ length: 16 }, (_, index) => index + 17))
  assert.deepEqual(paginateTestDriveListings(listings, 3).map((item) => item.id), [33, 34, 35])
})

test('matches selected amenities against boolean and structured property data', () => {
  const listing = {
    pool: 1,
    parking: true,
    internet: true,
    tz_amenities_json: ['sea_view', 'rooftop_terrace'],
  }

  assert.equal(matchesSelectedTestDriveAmenities(listing, []), true)
  assert.equal(matchesSelectedTestDriveAmenities(listing, ['Бассейн']), true)
  assert.equal(matchesSelectedTestDriveAmenities(listing, ['Вид на море', 'Терраса']), true)
  assert.equal(matchesSelectedTestDriveAmenities(listing, ['Wi-Fi', 'Парковка']), true)
  assert.equal(matchesSelectedTestDriveAmenities(listing, ['Лифт']), false)
})

test('maps real amenity fields through to a test-drive listing', () => {
  const property = {
    id: 92,
    pool: 1,
    parking: true,
    internet: 1,
    tz_amenities_json: ['sea_view'],
  }

  const listing = mapRealTestDriveListing(property, 0, { id: 'houses:92', image: '' })

  assert.equal(listing.pool, 1)
  assert.equal(listing.parking, true)
  assert.equal(listing.internet, 1)
  assert.deepEqual(listing.tz_amenities_json, ['sea_view'])
})

test('test-drive page does not declare or render generated demo listings', async () => {
  const pageSource = await readFile(new URL('./TestDriveLandingPage.jsx', import.meta.url), 'utf8')

  assert.doesNotMatch(pageSource, /GENERATED_LISTINGS|BASE_LISTINGS|CARD_IMAGES/)
  assert.match(pageSource, /realTestDriveListings\(apiListings/)
  assert.match(pageSource, /\{loading \? null : filteredListings\.length === 0 \? \(/)
})
