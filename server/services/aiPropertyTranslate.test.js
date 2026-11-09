import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractListingTexts,
  splitTranslationForStore,
  parseExtraJson,
  parseJsonFromModel,
  normalizeAiTranslations,
  ALL_TRANSLATION_FIELDS,
  normalizeTranslationPropertyTable,
  isUntranslatedTarget,
  applyPhrasebook,
  applyEnMarketingPhrasebook,
  detectSourceLang,
  targetLangCodesFor,
  SITE_LANG_CODES,
  validatePropertyTranslations,
  persistPropertyTranslations,
  translatePropertyToAllLanguages,
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

test('reads model JSON from fenced text, arrays, and a truncated tail', () => {
  assert.equal(parseJsonFromModel('```json\n{"en":{"title":"Sea"}}\n```').en.title, 'Sea')
  assert.equal(
    parseJsonFromModel([{ type: 'text', text: '{"de":{"title":"Wohnung"}}' }]).de.title,
    'Wohnung',
  )
  const truncated = '{"en":{"title":"Sea apartment","description":"Bright"},"de":{"title":"Wohn'
  assert.equal(parseJsonFromModel(truncated).en.title, 'Sea apartment')
  assert.equal(parseJsonFromModel(truncated).de, undefined)
})

test('ignores fields the model invented for a listing', () => {
  const texts = { title: 'Квартира у моря', description: 'Светлая квартира' }
  const normalized = normalizeAiTranslations({
    en: {
      title: 'Apartment by the sea',
      description: 'Bright apartment',
      address: 'Fake street 1',
      city: 'Musterstadt',
    },
  }, texts, 'ru')
  assert.equal(normalized.en.title, 'Apartment by the sea')
  assert.equal(normalized.en.address, undefined)
  assert.equal(normalized.en.city, undefined)
  assert.equal(normalized.ru.title, texts.title)
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

const listingSource = { title: 'Дом у моря', description: 'Просторный дом с видом на море и садом' }
const completeTranslations = () => Object.fromEntries(SITE_LANG_CODES.map(lang => [lang, lang === 'ru'
  ? { ...listingSource }
  : { title: `${lang} seaside home`, description: `${lang} spacious home overlooking the sea with a garden` }]))

test('validates every language and every supplied field, including a missing description', () => {
  const translations = completeTranslations()
  assert.deepEqual(validatePropertyTranslations(listingSource, translations), [])
  delete translations.pl
  delete translations.fr.description
  translations.de.description = ' '
  const issues = validatePropertyTranslations(listingSource, translations)
  assert.ok(issues.includes('pl: missing language'))
  assert.ok(issues.includes('fr.description: missing translation'))
  assert.ok(issues.includes('de.description: missing translation'))
  assert.equal(isUntranslatedTarget(listingSource, {}, 'en'), true)
})

test('rejects even one Russian word in a long description and in extra fields', () => {
  const source = { ...listingSource, heating: 'Центральное' }
  const row = { title: 'Seaside home', description: `${'A home with a garden. '.repeat(30)} бассейн`, heating: 'Central' }
  assert.equal(isUntranslatedTarget(source, row, 'en'), true)
  row.description = 'A home with a garden'
  row.heating = 'Central отопление'
  assert.equal(isUntranslatedTarget(source, row, 'en'), true)
  row.heating = 'Central'
  assert.equal(isUntranslatedTarget(source, row, 'en'), false)
})

test('short copied descriptions and provider quota messages are also failures', () => {
  assert.equal(isUntranslatedTarget({ description: 'Bright home' }, { description: 'Bright home' }, 'fr', 'en'), true)
  assert.equal(isUntranslatedTarget(listingSource, { title: 'Seaside home', description: 'MYMEMORY WARNING: quota' }, 'en'), true)
})

test('incomplete translations cannot delete or overwrite existing rows', async () => {
  const translations = completeTranslations()
  delete translations.sv.description
  const prisma = { $transaction() { assert.fail('must validate before any write') } }
  await assert.rejects(persistPropertyTranslations(prisma, {
    propertyId: 1, propertyTable: 'apartments', sourceTexts: listingSource, translations,
  }), { code: 'INCOMPLETE_PROPERTY_TRANSLATIONS' })
})

function translationDatabase({ failWrite = false, withoutExtra = false } = {}) {
  let stored = [{ old: true }]
  let transactions = 0
  return {
    get rows() { return stored },
    get transactions() { return transactions },
    async $transaction(run) {
      transactions += 1
      let draft = structuredClone(stored)
      await run({ property_translations: {
        async deleteMany() { draft = [] },
        async create({ data }) {
          if (withoutExtra && 'extra_json' in data) throw new Error('column extra_json does not exist')
          if (failWrite && draft.length === 3) throw new Error('database unavailable')
          draft.push(data)
        },
      } })
      stored = draft
    },
  }
}

test('replaces all seven languages and both table aliases in one transaction', async () => {
  const prisma = translationDatabase()
  await persistPropertyTranslations(prisma, {
    propertyId: 1, propertyTable: 'apartments', sourceTexts: listingSource, translations: completeTranslations(),
  })
  assert.equal(prisma.transactions, 1)
  assert.equal(prisma.rows.length, 14)
  for (const lang of SITE_LANG_CODES) {
    assert.deepEqual(prisma.rows.filter(row => row.lang_code === lang).map(row => row.property_table), ['properties_apartments', 'apartments'])
  }
})

test('failed replacement rolls back and keeps the previous translations', async () => {
  const prisma = translationDatabase({ failWrite: true })
  await assert.rejects(persistPropertyTranslations(prisma, {
    propertyId: 1, propertyTable: 'apartments', sourceTexts: listingSource, translations: completeTranslations(),
  }), /database unavailable/)
  assert.deepEqual(prisma.rows, [{ old: true }])
})

test('retries an old schema without extra_json in a fresh transaction', async () => {
  const prisma = translationDatabase({ withoutExtra: true })
  await persistPropertyTranslations(prisma, {
    propertyId: 1, propertyTable: 'apartments', sourceTexts: listingSource, translations: completeTranslations(),
  })
  assert.equal(prisma.transactions, 2)
  assert.equal(prisma.rows.length, 14)
  assert.ok(prisma.rows.every(row => !('extra_json' in row)))
})

test('an old schema cannot silently discard required extra field translations', async () => {
  const prisma = translationDatabase({ withoutExtra: true })
  const sourceTexts = { ...listingSource, heating: 'Центральное' }
  const translations = completeTranslations()
  for (const lang of SITE_LANG_CODES) translations[lang].heating = lang === 'ru' ? 'Центральное' : 'Central'
  await assert.rejects(persistPropertyTranslations(prisma, {
    propertyId: 1, propertyTable: 'apartments', sourceTexts, translations,
  }), /extra_json/)
  assert.equal(prisma.transactions, 1)
  assert.deepEqual(prisma.rows, [{ old: true }])
})

test('a complete AI response needs no fallback requests', async t => {
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(completeTranslations()) } }] }) }
  })
  // Use the anonymous provider; no real credentials or network calls in tests.
  const previous = process.env.AI_PROVIDER
  process.env.AI_PROVIDER = 'pollinations'
  t.after(() => { if (previous === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous })
  assert.deepEqual(await translatePropertyToAllLanguages(listingSource), completeTranslations())
  assert.equal(requests, 1)
})

test('partial AI and failed fallbacks are an error, never a successful source copy', async t => {
  const previous = process.env.AI_PROVIDER
  process.env.AI_PROVIDER = 'pollinations'
  t.after(() => { if (previous === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous })
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1
    if (requests === 1) return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ en: { title: 'Seaside home' } }) } }] }) }
    return { ok: false, status: 429 }
  })
  await assert.rejects(translatePropertyToAllLanguages(listingSource), { code: 'INCOMPLETE_PROPERTY_TRANSLATIONS' })
  assert.ok(requests > 1, 'missing AI description must trigger fallback')
})
