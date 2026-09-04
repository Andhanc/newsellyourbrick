import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isSpainPropertyLegalQuery,
  selectSpainLegalKnowledge,
  SPAIN_LEGAL_SOURCES,
  SPAIN_LEGAL_TOPICS,
} from './spainLegalKnowledge.js'
import { clearSpainLegalLiveCache, getSpainLegalLiveContext } from './spainLegalLiveSources.js'
import { buildAssistantReply } from './askAssistant.js'
import { classifyScenario, SCENARIOS } from './intentGate.js'

test('Spain legal index covers all 255 approved topics with official HTTPS sources', () => {
  assert.equal(SPAIN_LEGAL_TOPICS.length, 255)
  assert.equal(new Set(SPAIN_LEGAL_TOPICS.map((topic) => topic.title)).size, 254)
  // "Присяжный перевод документов" is intentionally relevant to both seller capacity and foreign sellers.
  for (const topic of SPAIN_LEGAL_TOPICS) {
    assert.ok(topic.sourceIds.length > 0, `missing sources for ${topic.title}`)
    for (const sourceId of topic.sourceIds) {
      const source = SPAIN_LEGAL_SOURCES[sourceId]
      assert.ok(source, `unknown source ${sourceId}`)
      assert.match(source.url, /^https:\/\//)
    }
  }
})

test('broad Spanish property-sale questions enter the dedicated legal scenario', () => {
  const questions = [
    'Какая сейчас ставка по ипотеке в Испании?',
    'Нужно ли удерживать 3% при продаже нерезидентом?',
    'Как продать квартиру с арендатором?',
    'Что проверить в Nota Simple?',
    'Можно ли продать наследственную квартиру?',
    'Какие риски у доверенности с апостилем?',
  ]
  for (const question of questions) {
    assert.equal(isSpainPropertyLegalQuery(question), true, question)
    assert.equal(classifyScenario(question).scenario, SCENARIOS.SPAIN_LEGAL, question)
  }
})

test('mortgage retrieval prioritizes mortgage topics and only one verified rate policy', () => {
  const context = selectSpainLegalKnowledge('Какая сейчас ставка по ипотеке в Испании?')
  assert.equal(context.coverage.topicCount, 255)
  assert.ok(context.coverage.matchedTopics.every((title) => /ипотек|ипотеч|банк/i.test(title)))
  assert.deepEqual(context.verifiedFacts.map((fact) => fact.id), ['mortgage-rate-policy'])
  assert.ok(context.sources.some((source) => source.id === 'bdeMortgageTable'))
})

test('live mortgage pages are structured and expired offers are marked', async () => {
  clearSpainLegalLiveCache()
  const htmlByUrl = new Map([
    [SPAIN_LEGAL_SOURCES.bdeMortgageTable.url, `
      <h1>Tipos oficiales de referencia del mercado hipotecario (Año 2026)</h1>
      <table><tr><th>groups</th></tr><tr>${Array.from({ length: 16 }, (_, i) => `<th>h${i}</th>`).join('')}</tr>
      <tr><td>Jul</td><td>3,077</td>${Array.from({ length: 6 }, () => '<td></td>').join('')}<td>2,855</td><td>3,520</td></tr>
      <tr><td>Ago</td><td></td>${Array.from({ length: 6 }, () => '<td></td>').join('')}<td>2,954</td><td></td></tr></table>`],
    [SPAIN_LEGAL_SOURCES.caixaBankMortgage.url, '<main>TIN 2,80% TAE 4,40% sin fecha final</main>'],
    [SPAIN_LEGAL_SOURCES.santanderMortgage.url, '<main>Oferta válida hasta el 15 de agosto de 2026. TIN 2,96% TAE 3,65%</main>'],
    [SPAIN_LEGAL_SOURCES.sabadellMortgage.url, '<main>Condiciones vigentes hasta el 3 de octubre de 2026. TIN 2,75% TAE 3,58%</main>'],
  ])
  const fetchImpl = async (url) => ({
    ok: true,
    text: async () => htmlByUrl.get(url),
  })
  const live = await getSpainLegalLiveContext('ипотечная ставка', { fetchImpl })
  const bde = live.find((item) => item.sourceId === 'bdeMortgageTable')
  const santander = live.find((item) => item.sourceId === 'santanderMortgage')
  assert.match(bde.content, /"Euribor_12_months":\{"period":"Ago 2026","percent":"2.954"\}/)
  assert.equal(santander.validUntil, '2026-08-15')
  assert.equal(santander.status, 'expired')
})

test('LLM prompt receives current Spain-only rules and official source metadata', async () => {
  clearSpainLegalLiveCache()
  let prompt = ''
  const reply = await buildAssistantReply({
    messages: [{ sender: 'user', text: 'Дает ли покупка квартиры Golden Visa в Испании?' }],
    fetchImpl: async () => { throw new Error('not needed for visa') },
    postChat: async (payload) => {
      prompt = payload.messages[0].content
      return { choices: [{ message: { content: JSON.stringify({
        text: 'Нет. Для новых заявлений режим отменён с 3 апреля 2025 года.',
        needsMoreInfo: false,
      }) } }] }
    },
  })
  assert.equal(reply.scenario, SCENARIOS.SPAIN_LEGAL)
  assert.match(prompt, /SPAIN LEGAL VERIFIED CONTEXT/)
  assert.match(prompt, /отменён с 3 апреля 2025 года/)
  assert.doesNotMatch(prompt, /Дубай.*резидентская виза/)
  assert.ok(reply.sources.some((source) => source.id === 'boeGoldenVisaRepeal'))
})
