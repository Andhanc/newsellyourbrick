import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { presentationCopy, PRESENTATION_LANGUAGES } from './propertyPresentationCopy.js'
import { composePropertyPresentation, presentationSaleFacts, presentationImages, propertyPresentationCacheModel } from './propertyPresentation.js'
import { preparePresentationLocation, mercatorPixel } from './propertyPresentationMap.js'
import { renderPropertyPresentationHtml } from './propertyPresentationRenderer.js'
import { normalizePropertyAiRequest, parsePropertyAiModelContent } from './propertyAiReportContract.js'
import { requestPropertyAiModel, runPropertyAiGeneration } from './propertyAiGenerate.js'

const property = { id: 83, title: 'Дом <script>alert(1)</script>', price: 100000, currency: 'EUR', area: 90, images: ['/images/home.jpg'], buy_now_enabled: 1 }
const ai = {
  title: 'Дом', summary: 'Описание', directAnswer: 'Презентация готова.', shortAnswer: 'Готово.', conclusion: 'Посмотрите объект.',
  slides: [
    { layout: 'cover', title: 'Дом', body: 'Описание' },
    { layout: 'stats', title: 'В цифрах', cards: [{ title: 'Площадь', value: '90 м²', body: 'Место для разных сценариев' }] },
    { layout: 'split', title: 'Характеристики', body: 'Преимущества' },
    { layout: 'cards', title: 'Удобства', cards: [{ title: 'Терраса', body: 'По данным продавца' }] },
  ],
}
const makeReport = (p = property, language = 'ru') => composePropertyPresentation(parsePropertyAiModelContent(JSON.stringify(ai), { property: p }), p, language)

test('presentation requests isolate cache questions by supported locale and retain old request shape', () => {
  assert.match(normalizePropertyAiRequest({ category: 'presentation', language: 'ru' }).question, /^\[ru\]/)
  assert.equal(normalizePropertyAiRequest({ category: 'presentation', language: 'bad' }).language, 'en')
  assert.deepEqual(Object.keys(normalizePropertyAiRequest({ category: 'details' })), ['category', 'question'])
})

test('sale facts honor debt and share precedence and do not offer disabled buy now', () => {
  assert.equal(presentationSaleFacts({ ...property, is_auction: 1, buy_now_enabled: 0 }).title, 'Auction')
  assert.equal(presentationSaleFacts({ ...property, is_auction: 1 }).title, 'Auction / Buy now')
  assert.equal(presentationSaleFacts({ ...property, sale_type: 'share', total_shares: 10 }).kind, 'share')
  assert.equal(presentationSaleFacts({ ...property, sale_type: 'share', has_debt: 1 }).kind, 'debt')
  assert.equal(presentationSaleFacts({ ...property, buy_now_enabled: 0 }).kind, 'listing')
  assert.deepEqual(presentationSaleFacts({ ...property, buy_now_enabled: 0 }).paymentFacts, [])
})

test('payment amounts are derived only for enabled whole-property checkout', () => {
  const sale = presentationSaleFacts(property, 'en')
  assert.deepEqual(sale.paymentFacts.map((f) => f.value), ['€10,000', '€90,000'])
  for (const sale_type of ['auction', 'share', 'debt']) {
    assert.deepEqual(presentationSaleFacts({ ...property, sale_type }).paymentFacts, [])
  }
})

test('zero and missing prices never become invented price estimates', () => {
  assert.equal(presentationSaleFacts({ price: null }).facts.length, 0)
  assert.equal(presentationSaleFacts({ price: 0 }).facts.length, 0)
})

test('all seven locales provide the same complete payment and map copy', () => {
  for (const language of PRESENTATION_LANGUAGES) {
    const copy = presentationCopy(language)
    assert.equal(Object.keys(copy).length, 46)
    assert.ok(Object.values(copy).every((v) => typeof v === 'string' && v.length))
    assert.ok(copy.approximateLocation.length > 50)
  }
})

test('cache model changes when listing data, locale or model changes', () => {
  const key = propertyPresentationCacheModel('model', property, 'ru')
  assert.notEqual(key, propertyPresentationCacheModel('model', { ...property, price: 200000 }, 'ru'))
  assert.notEqual(key, propertyPresentationCacheModel('model', property, 'en'))
  assert.notEqual(key, propertyPresentationCacheModel('other-model', property, 'ru'))
})

test('listing images exclude imported agency logos and duplicate size variants', () => {
  assert.deepEqual(presentationImages({ photos: JSON.stringify([
    'https://example.com/pool.jpg', 'https://example.com/pool-1024x683.jpg',
    'https://example.com/agency_logo.png', '/uploads/house.jpg', 'javascript:alert(1)',
  ]) }), ['https://example.com/pool.jpg', '/uploads/house.jpg'])
})

test('geocoding rejects a namesake bus stop and marks area results as approximate', async () => {
  const result = await preparePresentationLocation({ location: 'El Duque' }, {
    geocode: async () => [
      { lat: '1', lon: '2', type: 'bus_stop' },
      { lat: '28.09', lon: '-16.73', type: 'neighbourhood' },
    ],
    renderMap: async (_c, zoom) => `map-${zoom}`,
  })
  assert.deepEqual(result.coordinates, [28.09, -16.73])
  assert.equal(result.presentationLocation.precision, 'area')
  assert.deepEqual(result.presentationLocation.maps, ['map-11', 'map-15'])
})

test('missing location does not invent coordinates or fetch maps', async () => {
  const result = await preparePresentationLocation({}, {
    geocode: () => { throw new Error('should not geocode') },
    renderMap: () => { throw new Error('should not render') },
  })
  assert.equal(result.presentationLocation.coordinates, null)
  assert.deepEqual(result.presentationLocation.maps, [])
})

test('Mercator coordinates keep the equator centered and handle polar inputs', () => {
  assert.deepEqual(mercatorPixel({ lat: 0, lng: 0 }, 1), { x: 256, y: 256 })
  assert.ok(Number.isFinite(mercatorPixel({ lat: 90, lng: 180 }, 15).y))
})

test('all nine mandatory slides include the exact brand and escape listing content', () => {
  const report = makeReport()
  const html = renderPropertyPresentationHtml({ report, property })
  assert.equal(report.slides.length, 9)
  assert.equal(report.slides[4].layout, 'neighborhood')
  assert.equal(report.slides[6].layout, 'sale')
  assert.equal(report.slides[7].layout, 'payment')
  assert.equal((html.match(/SellYour<span>Brick<\/span>/g) || []).length, 9)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /size:1280px 720px/)
  assert.match(html, /Локация не указана/)
})

test('real map tiles retain attribution and area uncertainty', () => {
  const p = { ...property, presentationLocation: { label: 'El Duque', coordinates: { lat: 28, lng: -16 }, precision: 'area', maps: ['data:image/png;base64,YQ==', 'data:image/png;base64,Yg=='] } }
  const html = renderPropertyPresentationHtml({ report: makeReport(p), property: p })
  assert.equal((html.match(/© OpenStreetMap contributors/g) || []).length, 2)
  assert.match(html, /Точный адрес уточните/)
  assert.match(html, /map-halo/)
})

test('presentation model receives sale context, locale and compact output schema', async () => {
  let body
  await requestPropertyAiModel({ category: 'presentation', question: 'Презентация', property, language: 'ru' }, {
    apiKey: 'test', pickImages: async () => [],
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body)
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(ai) } }] }) }
    },
  })
  assert.match(body.messages[0].content, /language ru/)
  assert.match(body.messages[0].content, /10%/)
  assert.equal(body.response_format.json_schema.name, 'property_brochure_copy')
  assert.equal(body.response_format.json_schema.schema.properties.slides.maxItems, 4)
})

test('generation preserves prepared maps and filtered photos through enrichment and rendering', async () => {
  let rendered
  const result = await runPropertyAiGeneration({ reportId: 1, conversationId: 1, property, category: 'presentation', language: 'ru' }, {
    prepareLocation: async (p) => ({ ...p, presentationLocation: { label: 'Area', precision: 'area', maps: ['map'] } }),
    loadNeighborhood: async (p) => { assert.equal(p.presentationLocation.label, 'Area'); return p },
    requestModel: async () => JSON.stringify(ai),
    renderPdf: async (input) => { rendered = input; return Buffer.from('%PDF') },
    updateReport: async (_id, patch) => patch,
    appendMessage: async () => {},
  })
  assert.equal(result.status, 'completed')
  assert.equal(rendered.report.location.label, 'Area')
  assert.equal(rendered.report.slides.length, 9)
})

test('OpenRouter errors remain failures for presentations instead of fake successful AI output', async () => {
  const statuses = []
  await assert.rejects(runPropertyAiGeneration({ reportId: 1, conversationId: 1, property, category: 'presentation' }, {
    prepareLocation: async (p) => p, loadNeighborhood: async (p) => p,
    requestModel: async () => { throw new Error('credits unavailable') },
    renderPdf: async () => { throw new Error('must not render') },
    updateReport: async (_id, patch) => { statuses.push(patch.status); return patch },
    appendMessage: async () => {},
  }), /credits unavailable/)
  assert.deepEqual(statuses, ['analyzing', 'failed'])
})

test('web and legacy experience/service stay identical with complete scenario translations', async () => {
  for (const file of ['components/PropertyAiExperience.jsx', 'services/propertyAiService.js']) {
    const [web, legacy] = await Promise.all([
      fs.readFile(new URL(`../../src/${file}`, import.meta.url), 'utf8'),
      fs.readFile(new URL(`../../apps/client/src/legacy/${file}`, import.meta.url), 'utf8'),
    ])
    assert.equal(web, legacy)
  }
  for (const language of PRESENTATION_LANGUAGES) {
    const [web, legacy] = await Promise.all(['../../src', '../../apps/client/src/legacy'].map(async (root) => JSON.parse(await fs.readFile(new URL(`${root}/i18n/locales/mainPage/${language}.json`, import.meta.url), 'utf8'))))
    for (const key of ['propertyAi_scenarioPresentation', 'propertyAi_scenarioPresentationQuestion', 'propertyAi_presentationPagesReady']) {
      assert.ok(web[key]); assert.equal(web[key], legacy[key])
    }
  }
})

test('imported media uses only the actual listing gallery, not recommendations or agent photos', async () => {
  const { preparePresentationMedia } = await import('./propertyPresentationMedia.js')
  const p = await preparePresentationMedia({ description: 'Источник: https://housetenerife.eu/ru/property/example/', photos: '["https://housetenerife.eu/agent.jpg"]' }, {
    fetchImpl: async () => ({ ok: true, text: async () => '<div class="hs-gallery-v5-grid"><img src="https://housetenerife.eu/wp-content/uploads/home.jpg"></div><aside><img src="https://housetenerife.eu/wp-content/uploads/other-house.jpg"></aside>' }),
  })
  assert.equal(p.presentationMediaVerified, true)
  assert.deepEqual(presentationImages(p), ['https://housetenerife.eu/wp-content/uploads/home.jpg'])
})

test('arbitrary and lookalike source URLs never trigger source fetches', async () => {
  const { preparePresentationMedia } = await import('./propertyPresentationMedia.js')
  for (const source of ['https://127.0.0.1/property/a', 'https://housetenerife.eu.evil.example/property/a', 'https://housetenerife.eu:444/ru/property/a']) {
    let called = false
    await preparePresentationMedia({ description: `Источник: ${source}` }, { fetchImpl: async () => { called = true } })
    assert.equal(called, false)
  }
})

test('nearby fallback extracts named amenities, ignores unrelated features and deduplicates names', async () => {
  const { parsePresentationNearbyElements } = await import('./propertyPresentationNeighborhood.js')
  const groups = parsePresentationNearbyElements([
    { id: 1, type: 'node', lat: 28, lon: -16, tags: { name: 'Shop', shop: 'supermarket' } },
    { id: 2, type: 'node', lat: 28.001, lon: -16, tags: { name: 'Shop', shop: 'supermarket' } },
    { id: 3, type: 'node', lat: 28.002, lon: -16, tags: { name: 'School', amenity: 'school' } },
    { id: 4, type: 'node', lat: 29, lon: -16, tags: { name: 'Far away', amenity: 'school' } },
    { id: 5, type: 'node', lat: 28, lon: -16, tags: { name: 'Hotel', tourism: 'hotel' } },
  ], { lat: 28, lng: -16 })
  assert.deepEqual(groups.map((g) => g.category), ['schools', 'shops'])
  assert.equal(groups[1].places.length, 1)
  assert.equal(groups[0].places[0].sourceUrl, 'https://www.openstreetmap.org/node/3')
})

test('a full street address takes priority over a generic listing location', async () => {
  let query
  await preparePresentationLocation({ address: 'Street 12', city: 'Town', country: 'Country', location: 'City centre' }, {
    geocode: async ({ q }) => { query = q; return [] },
  })
  assert.equal(query, 'Street 12, Town, Country')
})

test('presentation model configuration is resolved after server dotenv initialization', async () => {
  const { getPropertyPresentationModel } = await import('./propertyAiGenerate.js')
  const previous = process.env.PROPERTY_PRESENTATION_MODEL
  try {
    process.env.PROPERTY_PRESENTATION_MODEL = 'configured-after-import'
    assert.equal(getPropertyPresentationModel(), 'configured-after-import')
  } finally {
    if (previous == null) delete process.env.PROPERTY_PRESENTATION_MODEL
    else process.env.PROPERTY_PRESENTATION_MODEL = previous
  }
})

test('localized brochure strengths do not acquire English analytical fallback copy', () => {
  const report = parsePropertyAiModelContent(JSON.stringify({ ...ai, strengths: ['Площадь указана', 'Цена известна'], risks: ['Проверить документы', 'Уточнить адрес'] }), { property, category: 'presentation' })
  assert.deepEqual(report.strengths, ['Площадь указана', 'Цена известна'])
  assert.deepEqual(report.risks, ['Проверить документы', 'Уточнить адрес'])
})
