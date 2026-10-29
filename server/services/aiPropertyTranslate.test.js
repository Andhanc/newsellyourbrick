import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractListingTexts,
  splitTranslationForStore,
  parseExtraJson,
  ALL_TRANSLATION_FIELDS,
  normalizeTranslationPropertyTable,
  isUntranslatedTarget,
  applyPhrasebook,
  SITE_LANG_CODES,
} from './aiPropertyTranslate.js'
import {
  applyPropertyTranslationRow,
  translationPropertyTable,
} from '../propertyListBatch.js'

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

test('normalizes apartments/houses aliases to properties_* tables', () => {
  assert.equal(normalizeTranslationPropertyTable('apartments'), 'properties_apartments')
  assert.equal(normalizeTranslationPropertyTable('houses'), 'properties_houses')
  assert.equal(normalizeTranslationPropertyTable('properties_apartments'), 'properties_apartments')
  assert.equal(translationPropertyTable('apartments', 'apartment'), 'properties_apartments')
  assert.equal(translationPropertyTable('houses', 'villa'), 'properties_houses')
  assert.equal(translationPropertyTable(null, 'house'), 'properties_houses')
})

test('detects untranslated cyrillic copies in target languages', () => {
  const source = {
    title: 'Долевое участие, корпус 4',
    description: 'Тенерифе. Порт',
  }
  assert.equal(
    isUntranslatedTarget(source, { title: source.title, description: source.description }, 'en'),
    true,
  )
  assert.equal(
    isUntranslatedTarget(source, { title: 'Shared ownership, building 4', description: 'Tenerife. Port' }, 'en'),
    false,
  )
  assert.equal(isUntranslatedTarget(source, source, 'ru'), false)
})

test('site languages include polish', () => {
  assert.ok(SITE_LANG_CODES.includes('pl'))
})

test('phrasebook translates key russian listing phrases', () => {
  const en = applyPhrasebook('Talaïa Residences — долевое участие, корпус 4', 'en')
  assert.match(en, /equity participation/i)
  assert.match(en, /building 4/i)
  assert.equal(/[а-яё]/i.test(en), false)
  const sv = applyPhrasebook('Испания, бассейн, вид на океан', 'sv')
  assert.match(sv, /Spanien/i)
  assert.match(sv, /havsutsikt/i)
})
