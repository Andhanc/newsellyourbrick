import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeConversation } from './dialogContext.js'
import { searchCatalog } from './propertyMatcher.js'

const catalog = [
  {
    id: 11,
    title: 'Apartment in Barcelona',
    location: 'Spain, Barcelona',
    price: 380000,
    rooms: 2,
    property_type: 'apartment',
    isAuction: true,
  },
  {
    id: 12,
    title: 'Villa Marbella',
    location: 'Spain, Marbella',
    price: 1200000,
    rooms: 5,
    property_type: 'villa',
    isAuction: false,
  },
  {
    id: 21,
    title: 'Marina apartment',
    location: 'Dubai Marina',
    price: 390000,
    rooms: 2,
    property_type: 'apartment',
    isAuction: true,
  },
  {
    id: 31,
    title: 'Share loft Barcelona',
    location: 'Spain, Barcelona',
    price: 90000,
    property_type: 'apartment',
    is_shared_ownership: 1,
  },
  {
    id: 41,
    title: 'Distressed Madrid',
    location: 'Spain, Madrid',
    price: 220000,
    property_type: 'apartment',
    is_debt: 1,
  },
]

test('personal-use branch returns auction or buy-now and excludes shares', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя, до 400 тысяч, Испания, Barcelona, квартира' }],
    'ru',
    {},
    { catalog },
  )
  const match = searchCatalog(catalog, dialog, 5)
  assert.deepEqual(match.ids, [11])
  assert.ok(!match.ids.includes(31))
})

test('does not pick Dubai when Spain was requested', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя, Испания, квартира, бюджет 400000' }],
    'ru',
    {},
    { catalog },
  )
  const match = searchCatalog(catalog, dialog, 5)
  assert.ok(match.ids.includes(11))
  assert.ok(!match.ids.includes(21))
})

test('drops far more expensive villas outside the band for rental search', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'под сдачу, 350 тысяч евро, Испания, квартира' }],
    'ru',
    {},
    { catalog },
  )
  const match = searchCatalog(catalog, dialog, 5)
  assert.ok(!match.ids.includes(12))
})

test('investment branch returns only shares and debts', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'хочу инвестировать, квартира, Испания, Barcelona' }],
    'ru',
    {},
    { catalog },
  )
  const match = searchCatalog(catalog, dialog, 5)
  assert.ok(match.ids.includes(31))
  assert.ok(!match.ids.includes(11))
  assert.ok(match.items.every((item) => item.isShare || item.isDebt))
})

test('does not invent a city that is missing from the catalog', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя, Ибица, квартира, бюджет 400000' }],
    'ru',
    {},
    { catalog },
  )
  assert.equal(dialog.hasLocation, false)
  const match = searchCatalog(catalog, dialog, 5)
  assert.ok(!match.items.some((item) => /ibiza|ибиц/i.test(item.location)))
})

test('semantic preferences from the latest request improve ranking', () => {
  const featureCatalog = [
    {
      id: 51,
      title: 'City apartment',
      location: 'Spain, Barcelona',
      price: 400000,
      rooms: 2,
      property_type: 'apartment',
      description: 'Quiet residential street near offices.',
    },
    {
      id: 52,
      title: 'Coastal apartment',
      location: 'Spain, Barcelona',
      price: 405000,
      rooms: 2,
      property_type: 'apartment',
      description: 'Sea view and a large terrace.',
      amenities: ['swimming pool', 'parking'],
    },
  ]
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя, Испания, Барселона, квартира до 410000, нужен вид на море и бассейн' }],
    'ru',
    {},
    { catalog: featureCatalog },
  )
  const match = searchCatalog(featureCatalog, dialog, 2)
  assert.equal(match.ids[0], 52)
  assert.match(match.items[0].description, /Sea view/i)
  assert.deepEqual(match.items[0].amenities, ['swimming pool', 'parking'])
})
