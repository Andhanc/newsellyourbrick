import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detectNavigationFromMessage,
  estimateSimpleYield,
  extractYieldInputsFromMessage,
  pickLocalRecommendations,
  refreshAssistantMessageCopy,
  sanitizeNavigationLinks,
  ensureInvestorPanelNavigation,
} from './siteAssistantHelpers.js'

test('sanitizeNavigationLinks keeps only allowed paths', () => {
  const links = sanitizeNavigationLinks([
    { path: '/calculator', label: 'Investor' },
    { path: 'https://evil.com/phish', label: 'Bad' },
    { path: '/map', label: 'Map' },
    '/auction',
  ])
  assert.deepEqual(
    links.map((l) => l.path),
    ['/calculator', '/map', '/auction'],
  )
})

test('detectNavigationFromMessage finds calculator and map', () => {
  const links = detectNavigationFromMessage('открой калькулятор доходности и карту')
  assert.ok(links.some((l) => l.path === '/calculator'))
  assert.ok(links.some((l) => l.path === '/map'))
})

test('ordinary request to view apartments does not create a test-drive button', () => {
  const links = detectNavigationFromMessage('давайте посмотрим квартиры')
  assert.ok(!links.some((link) => link.path === '/test-drive'))
})

test('removes a stale test-drive link from an ordinary catalog prompt', () => {
  const message = refreshAssistantMessageCopy({
    sender: 'assistant',
    text: 'Выберите страну: Беларусь.',
    navigation: [{ path: '/test-drive', label: 'Test-drive объектов' }],
  })
  assert.equal(message.navigation, null)
})

test('estimateSimpleYield computes gross yield', () => {
  const y = estimateSimpleYield({ price: 200000, annualRent: 10000 })
  assert.equal(y.yieldPercent, 5)
  assert.equal(y.monthlyIncome, 833)
})

test('extractYieldInputsFromMessage uses budget and rent', () => {
  const y = extractYieldInputsFromMessage('Посчитай доходность: цена 250000 €, аренда в месяц 1200 €', {
    purpose: 'инвестиции',
  })
  assert.ok(y)
  assert.equal(y.price, 250000)
  assert.equal(y.annualRent, 14400)
})

test('extractYieldInputsFromMessage ignores invest advice without explicit yield ask', async () => {
  const { wantsExplicitYieldCalc, buildOfflineAssistantReply } = await import('./siteAssistantHelpers.js')
  const prefs = { purpose: 'инвестиции', budget: 500000 }
  assert.equal(wantsExplicitYieldCalc('я хочу инвестировать 500 тысяч евро, что можешь посоветовать'), false)
  assert.equal(
    extractYieldInputsFromMessage(
      'а что скажешь про тип покупки, как лучше покупать недвижимость и какой тип',
      prefs,
    ),
    null,
  )
  const buyType = buildOfflineAssistantReply(
    'а что скажешь про тип покупки, как лучше покупать недвижимость и какой тип',
    prefs,
    [],
  )
  assert.ok(buyType)
  assert.match(buyType.text, /аукцион|buy now|shares/i)
  assert.equal(buyType.yieldEstimate, null)

  const invest = buildOfflineAssistantReply(
    'я хочу инвестировать 500 тысяч евро, что можешь посоветовать, какой тип объекта, какой тип продажи и остальное',
    prefs,
    [],
  )
  assert.ok(invest)
  assert.match(invest.text, /квартир|аукцион|shares/i)
  assert.equal(invest.yieldEstimate, null)
  assert.doesNotMatch(invest.text, /валовая доходность|4\.5%/i)
})

test('extractYieldInputsFromMessage still works for explicit calc', () => {
  const y = extractYieldInputsFromMessage('посчитай доходность при цене 500000', { budget: 500000 })
  assert.ok(y)
  assert.equal(y.price, 500000)
})

test('pickLocalRecommendations prefers matching budget and location', () => {
  const ids = pickLocalRecommendations(
    { budget: 300000, location: 'Испания', propertyType: 'квартира' },
    [
      { id: 1, price: 290000, location: 'Spain, Tenerife', name: 'Apartment sea view', rooms: 2 },
      { id: 2, price: 900000, location: 'Dubai Marina', name: 'Villa', rooms: 5 },
      { id: 3, price: 310000, location: 'Barcelona, Spain', name: 'Nice apartment', rooms: 2 },
    ],
    2,
  )
  assert.deepEqual(ids, [1, 3])
})

test('ensureInvestorPanelNavigation adds calculator for yield questions', () => {
  const nav = ensureInvestorPanelNavigation([], { purpose: 'инвестиции' }, 'какая доходность?', {
    yieldPercent: 5,
  })
  assert.equal(nav[0].path, '/calculator')
})

test('strips Spain or Dubai from leftover assistant copy', async () => {
  const { refreshAssistantMessageCopy, sanitizeAssistantCatalogCopy } = await import(
    './siteAssistantHelpers.js'
  )
  assert.match(
    sanitizeAssistantCatalogCopy('Помогу подобрать идеальный вариант в Испании или Дубае.'),
    /текущего каталога/,
  )
  assert.doesNotMatch(
    sanitizeAssistantCatalogCopy('Помогу подобрать идеальный вариант в Испании или Дубае.'),
    /Испани|Дуба/,
  )
  const rewritten = refreshAssistantMessageCopy(
    { sender: 'bot', text: 'Hello! Perfect property in Spain or Dubai.' },
    'Welcome from the current catalog.',
  )
  assert.equal(rewritten.text, 'Welcome from the current catalog.')
})

test('visibleAssistantButtons keeps only manager contact chips', async () => {
  const { visibleAssistantButtons } = await import('./siteAssistantHelpers.js')
  assert.deepEqual(
    visibleAssistantButtons(['Для себя', { type: 'contact_pref', value: 'phone', label: 'Звонок' }]).map(
      (item) => item.value,
    ),
    ['phone'],
  )
})

test('offline listing ask uses catalog cities instead of Madrid or Dubai', async () => {
  const { buildOfflineAssistantReply } = await import('./siteAssistantHelpers.js')
  const reply = buildOfflineAssistantReply(
    'для себя',
    { purpose: 'для себя' },
    [
      { id: 1, location: 'Беларусь, Минск', price: 120000 },
      { id: 2, location: 'Беларусь, Минск', price: 150000 },
    ],
    { force: true },
  )
  assert.ok(reply)
  assert.match(reply.text, /Минск/)
  assert.doesNotMatch(reply.text, /Мадрид|Дубай/)
  assert.equal(reply.buttons, null)
})

test('buildOfflineAssistantReply answers about the company', async () => {
  const { buildOfflineAssistantReply } = await import('./siteAssistantHelpers.js')
  const reply = buildOfflineAssistantReply('расскажите про вашу компанию', {}, [])
  assert.ok(reply)
  assert.match(reply.text, /SellYourBrick/i)
  assert.ok(reply.navigation?.some((n) => n.path === '/about'))
})

test('buildOfflineAssistantReply answers mortgage in Russian', async () => {
  const { buildOfflineAssistantReply, looksLikeModelReasoningLeak, stripModelReasoning } =
    await import('./siteAssistantHelpers.js')
  const reply = buildOfflineAssistantReply(
    'а расскажи про ипотеку в испании, что для этого нужно и как ее получают',
    {},
    [],
  )
  assert.ok(reply)
  assert.match(reply.text, /Ипотека в Испании/)
  assert.ok(/[а-яё]/i.test(reply.text))
  assert.equal(
    looksLikeModelReasoningLeak(
      'Okay, the user is asking about mortgages. Let me recall the instructions.',
    ),
    true,
  )
  assert.ok(stripModelReasoning('{"text":"Готово"}').includes('Готово'))
})

test('detectAssistantReplyLanguage supports only ru, en, es', async () => {
  const { detectAssistantReplyLanguage, buildOfflineAssistantReply } = await import(
    './siteAssistantHelpers.js'
  )
  assert.equal(detectAssistantReplyLanguage('расскажи про ипотеку'), 'ru')
  assert.equal(detectAssistantReplyLanguage('tell me about mortgages in Spain'), 'en')
  assert.equal(detectAssistantReplyLanguage('cuéntame sobre la hipoteca en España'), 'es')
  assert.equal(detectAssistantReplyLanguage('wie funktioniert die Auktion'), 'en')
  const es = buildOfflineAssistantReply('cuéntame sobre la hipoteca en España', {}, [])
  assert.ok(es)
  assert.match(es.text, /hipoteca/i)
})
