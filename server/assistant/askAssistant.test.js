import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAssistantContext, buildAssistantReply } from './askAssistant.js'
import { classifyScenario, SCENARIOS } from './intentGate.js'
import { selectRelevantKnowledge } from './knowledgeBase.js'
import { getKnowledgeBase } from './knowledgeBase.js'

const catalog = [
  {
    id: 7,
    title: 'Costa apartment',
    location: 'Spain, Costa del Sol',
    price: 280000,
    rooms: 2,
    property_type: 'apartment',
    isAuction: true,
  },
]

test('classifies platform and property scenarios', () => {
  assert.equal(classifyScenario('как работает аукцион').scenario, SCENARIOS.AUCTION_HELP)
  assert.equal(classifyScenario('расскажи про доли').scenario, SCENARIOS.SHARES)
  assert.equal(classifyScenario('что такое SellYourBrick').scenario, SCENARIOS.PLATFORM_HELP)
  assert.equal(classifyScenario('нужен менеджер').scenario, SCENARIOS.MANAGER_HANDOFF)
  assert.equal(classifyScenario('подбери квартиру в Дубае').scenario, SCENARIOS.PROPERTY_SEARCH)
})

test('knowledge retrieval prefers SellYourBrick sections', () => {
  const kb = getKnowledgeBase()
  const selected = selectRelevantKnowledge(kb, { query: 'как купить долю', scenario: 'shares' })
  assert.ok(selected.shares)
  assert.ok(selected.brand?.name === 'SellYourBrick')
})

test('living search uses country then city without requiring property type', () => {
  const ctx = buildAssistantContext({
    messages: [{ sender: 'user', text: 'для себя, покажи объекты в Испании' }],
    properties: catalog,
  })
  assert.equal(ctx.dialog.stage, 'NEED_CITY')
  assert.deepEqual(ctx.match.ids, [])
})

test('investment asks country and suppresses unrelated navigation buttons', async () => {
  const reply = await buildAssistantReply({
    messages: [{ sender: 'user', text: 'хочу инвестировать' }],
    properties: [
      ...catalog,
      {
        id: 8,
        title: 'Share studio',
        location: 'Spain, Barcelona',
        price: 70000,
        is_shared_ownership: 1,
      },
      {
        id: 9,
        title: 'Debt apartment',
        location: 'Spain, Madrid',
        price: 190000,
        is_debt: 1,
      },
    ],
    postChat: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            text: 'Откройте test-drive',
            navigation: [{ path: '/test-drive', label: 'Test-drive объектов' }],
          }),
        },
      }],
    }),
  })
  assert.equal(reply.stage, 'NEED_COUNTRY')
  assert.equal(reply.recommendations, null)
  assert.match(reply.text, /стран/)
  assert.equal(reply.navigation, null)
})

test('deterministic reply shortlists only after criteria are ready', async () => {
  const reply = await buildAssistantReply({
    messages: [
      { sender: 'user', text: 'для себя, до 300 тысяч, Испания, квартира, аукцион, Costa del Sol' },
    ],
    properties: catalog,
    postChat: async () => {
      throw new Error('llm disabled in test')
    },
  })
  assert.equal(reply.stage, 'SHOW_LISTINGS')
  assert.deepEqual(reply.recommendations, [7])
  assert.match(reply.text, /каталог|варианты|лоты/i)
})

test('city step offers only cities in the selected country even if the model invents Madrid', async () => {
  const minskCatalog = [
    {
      id: 11,
      title: 'Киселёва 18',
      location: 'Беларусь, Минск, улица Киселёва, 18',
      price: 120000,
      property_type: 'apartment',
    },
    {
      id: 12,
      title: 'Минск центр',
      location: 'Беларусь, Минск',
      price: 180000,
      property_type: 'apartment',
    },
    {
      id: 13,
      title: 'Минск доля',
      location: 'Беларусь, Минск',
      price: 40000,
      property_type: 'apartment',
      is_shared_ownership: 1,
    },
  ]
  const reply = await buildAssistantReply({
    messages: [
      { sender: 'user', text: 'для себя, нужна квартира' },
      { sender: 'assistant', text: 'Выберите страну' },
      { sender: 'user', text: 'Беларусь' },
    ],
    properties: minskCatalog,
    postChat: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              text: 'Какую локацию из каталога интересуют: Испания, Мадрид, Барселона?',
              buttons: ['Испания', 'Мадрид', 'Барселона'],
            }),
          },
        },
      ],
    }),
  })
  assert.equal(reply.stage, 'NEED_CITY')
  assert.equal(reply.buttons, null)
  assert.match(reply.text, /Минск/)
  assert.doesNotMatch(reply.text, /Мадрид|Дубай|Барселона/)
})

test('platform question does not dump listings', async () => {
  const reply = await buildAssistantReply({
    messages: [{ sender: 'user', text: 'как работает аукцион на вашем сайте' }],
    properties: catalog,
    postChat: async () => {
      throw new Error('llm disabled in test')
    },
  })
  assert.equal(reply.scenario, SCENARIOS.AUCTION_HELP)
  assert.equal(reply.recommendations, null)
  assert.ok(reply.navigation?.some((item) => item.path === '/auction'))
})
