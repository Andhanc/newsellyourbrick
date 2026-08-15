import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractListingTexts,
  splitTranslationForStore,
  parseExtraJson,
  ALL_TRANSLATION_FIELDS,
} from './aiPropertyTranslate.js'
import { applyPropertyTranslationRow } from '../propertyListBatch.js'

test('extracts all free-text listing fields and skips empties', () => {
  const texts = extractListingTexts({
    title: 'Вилла у моря',
    description: 'Светлый дом с видом',
    additional_amenities: 'Сауна',
    location: 'Коста Брава',
    address: 'Calle 1',
    city: 'Ллорет',
    country: 'Испания',
    renovation: 'Евроремонт',
    heating: '',
    price: 250000,
  })
  assert.equal(texts.title, 'Вилла у моря')
  assert.equal(texts.address, 'Calle 1')
  assert.equal(texts.renovation, 'Евроремонт')
  assert.equal(texts.heating, undefined)
  assert.ok(ALL_TRANSLATION_FIELDS.includes('debt_other'))
})

test('splits core columns and extra_json payload', () => {
  const split = splitTranslationForStore({
    title: 'Sea villa',
    description: 'Bright house',
    additional_amenities: 'Sauna',
    location: 'Costa Brava',
    city: 'Lloret',
    renovation: 'Renovated',
  })
  assert.equal(split.title, 'Sea villa')
  assert.equal(split.location, 'Costa Brava')
  assert.equal(split.extra.city, 'Lloret')
  assert.equal(split.extra.renovation, 'Renovated')
  assert.equal(split.extra.title, undefined)
})

test('applies core and extra translation fields onto a listing', () => {
  const prop = {
    id: 12,
    title: 'Вилла у моря',
    description: 'Светлый дом',
    city: 'Ллорет',
    renovation: 'Евроремонт',
  }
  applyPropertyTranslationRow(prop, {
    title: 'Sea villa',
    description: 'Bright house',
    additional_amenities: 'Sauna',
    location: 'Costa Brava',
    extra_json: JSON.stringify({ city: 'Lloret', renovation: 'Renovated' }),
  })
  assert.equal(prop.title, 'Sea villa')
  assert.equal(prop.name, 'Sea villa')
  assert.equal(prop.description, 'Bright house')
  assert.equal(prop.city, 'Lloret')
  assert.equal(prop.renovation, 'Renovated')
})

test('parseExtraJson tolerates invalid payloads', () => {
  assert.deepEqual(parseExtraJson(null), {})
  assert.deepEqual(parseExtraJson('{'), {})
  assert.deepEqual(parseExtraJson({ city: 'Valencia' }), { city: 'Valencia' })
})
