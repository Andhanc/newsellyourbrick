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
  applyEnMarketingPhrasebook,
  detectSourceLang,
  targetLangCodesFor,
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

test('heals english title copies when serving french locale', () => {
  const prop = {
    id: 9,
    title: 'Luxury Villa for Sale in Tenerife',
    description: 'Exclusive Luxury Villa near the beach',
  }
  applyPropertyTranslationRow(
    prop,
    {
      title: 'Luxury Villa for Sale in Tenerife',
      description: 'Exclusive Luxury Villa near the beach',
      location: 'Costa Adeje',
    },
    'fr',
  )
  assert.match(prop.title, /villa de luxe/i)
  assert.notEqual(prop.title, 'Luxury Villa for Sale in Tenerife')
  assert.equal(prop.location, 'Costa Adeje')
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

test('detects english source and rejects identical latin copies in fr', () => {
  const source = {
    title: 'Luxury Villa for Sale in Tenerife',
    description: 'Exclusive property near the golf course',
  }
  assert.equal(detectSourceLang(source), 'en')
  assert.deepEqual(targetLangCodesFor('en').sort(), ['de', 'es', 'fr', 'pl', 'ru', 'sv'].sort())
  assert.equal(
    isUntranslatedTarget(source, { title: source.title, description: source.description }, 'fr', 'en'),
    true,
  )
  assert.equal(
    isUntranslatedTarget(
      source,
      { title: 'Villa de luxe à vendre à Tenerife', description: 'Bien exclusif près du golf' },
      'fr',
      'en',
    ),
    false,
  )
  const frTitle = applyEnMarketingPhrasebook(source.title, 'fr')
  assert.match(frTitle, /villa de luxe/i)
  assert.notEqual(frTitle, source.title)
})

test('site languages include polish', () => {
  assert.ok(SITE_LANG_CODES.includes('pl'))
})

test('phrasebook translates key russian listing phrases', () => {
  const en = applyPhrasebook('Talaïa Residences — долевое участие, корпус 4', 'en')
  assert.match(en, /equity participation/i)
  assert.match(en, /building 4/i)
  assert.equal(/[а-яё]/i.test(en), false)
  const unit = applyPhrasebook('Talaïa Residences — квартира E1_P1_3F, 2 спальни, Adeje', 'es')
  assert.match(unit, /apartamento/i)
  assert.match(unit, /dormitorios/i)
  assert.equal(/[а-яё]/i.test(unit), false)
  const sv = applyPhrasebook('Испания, бассейн, вид на океан', 'sv')
  assert.match(sv, /Spanien/i)
  assert.match(sv, /havsutsikt/i)
})

test('flags partial cyrillic leftovers in target titles', () => {
  const source = { title: 'квартира E1, 2 спальни', description: 'Тенерифе' }
  assert.equal(
    isUntranslatedTarget(source, { title: 'квартира E1, 2 spaльни', description: 'Tenerife' }, 'en'),
    true,
  )
})
