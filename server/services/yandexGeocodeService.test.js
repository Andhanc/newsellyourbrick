import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addressFromYandexComponents,
  fieldsFromHit,
  geoObjectToNominatimHit,
  parseGeocoderResponse,
  parseSuggestResponse,
} from './yandexGeocodeService.js'

test('parses Yandex geocoder house into nominatim-like hit', () => {
  const payload = {
    response: {
      GeoObjectCollection: {
        featureMember: [
          {
            GeoObject: {
              name: 'улица Киселёва, 12',
              description: 'Минск, Беларусь',
              Point: { pos: '27.5618 53.9049' },
              metaDataProperty: {
                GeocoderMetaData: {
                  kind: 'house',
                  text: 'Беларусь, Минск, улица Киселёва, 12',
                  Address: {
                    formatted: 'Беларусь, Минск, улица Киселёва, 12',
                    Components: [
                      { kind: 'country', name: 'Беларусь' },
                      { kind: 'locality', name: 'Минск' },
                      { kind: 'street', name: 'улица Киселёва' },
                      { kind: 'house', name: '12' },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
  }

  const hits = parseGeocoderResponse(payload)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].lat, '53.9049')
  assert.equal(hits[0].lon, '27.5618')
  assert.equal(hits[0].type, 'house')
  assert.equal(hits[0].address.city, 'Минск')
  assert.equal(hits[0].address.road, 'улица Киселёва')
  assert.equal(hits[0].address.house_number, '12')

  const fields = fieldsFromHit(hits[0])
  assert.equal(fields.country, 'Беларусь')
  assert.equal(fields.city, 'Минск')
  assert.equal(fields.apartment, '12')
  assert.match(fields.location, /Киселёва/)
})

test('skips geocoder objects without a point', () => {
  assert.equal(geoObjectToNominatimHit({ name: 'x' }), null)
})

test('maps suggest components to address fields', () => {
  const hits = parseSuggestResponse({
    results: [
      {
        title: { text: 'улица Киселёва' },
        subtitle: { text: 'Минск, Беларусь' },
        tags: ['street'],
        uri: 'ymapsbm1://geo?ll=27.56%2C53.90',
        address: {
          formatted_address: 'Беларусь, Минск, улица Киселёва',
          component: [
            { name: 'Беларусь', kind: ['country'] },
            { name: 'Минск', kind: ['locality'] },
            { name: 'улица Киселёва', kind: ['street'] },
          ],
        },
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].display_name, 'Беларусь, Минск, улица Киселёва')
  assert.equal(hits[0].address.city, 'Минск')
  assert.equal(hits[0].uri.startsWith('ymapsbm1://'), true)
})

test('reads component names from yandex address parts', () => {
  const address = addressFromYandexComponents([
    { kind: 'country', name: 'Россия' },
    { kind: 'locality', name: 'Москва' },
  ])
  assert.equal(address.country, 'Россия')
  assert.equal(address.city, 'Москва')
})
