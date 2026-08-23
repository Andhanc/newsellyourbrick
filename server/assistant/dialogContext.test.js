import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeConversation,
  detectDealFormat,
  detectLocationPreference,
  detectPurposeKind,
  extractBudgetRange,
} from './dialogContext.js'

test('extractBudgetRange understands millions and ranges', () => {
  assert.equal(extractBudgetRange('бюджет 2 миллиона').maxPrice, 2_000_000)
  assert.equal(extractBudgetRange('до 350к').maxPrice, 350_000)
  assert.equal(extractBudgetRange('от 200 до 400 тыс').minPrice, 200_000)
  assert.equal(extractBudgetRange('от 200 до 400 тыс').maxPrice, 400_000)
  assert.equal(extractBudgetRange('около 500000').maxPrice, 500_000)
})

test('detects purpose, location and deal format for SellYourBrick', () => {
  assert.equal(detectPurposeKind('хочу инвестировать'), 'investment')
  assert.equal(detectPurposeKind('ищем для себя'), 'living')
  assert.equal(detectPurposeKind('под сдачу в аренду'), 'rental')
  assert.equal(detectLocationPreference('квартира в Дубае').location, 'dubai')
  assert.equal(detectLocationPreference('дом в Испании').location, 'spain')
  assert.equal(detectDealFormat('лучше доли').format, 'shares')
  assert.equal(detectDealFormat('купить сейчас без аукциона').format, 'buy_now')
})

const hierarchicalCatalog = [
  { id: 1, location: 'Беларусь, Минск', property_type: 'apartment', price: 120000 },
  { id: 2, location: 'Беларусь, Гомель', property_type: 'apartment', price: 90000 },
  { id: 3, location: 'Беларусь, Минск', property_type: 'house', price: 180000 },
  { id: 4, location: 'Spain, Barcelona', property_type: 'apartment', price: 280000 },
]

test('first mandatory step is investment or personal use', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'Здравствуйте' }],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'NEED_PURPOSE')
  assert.equal(dialog.hasPurpose, false)
})

test('after purpose asks country and does not require property type', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя' }],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'NEED_COUNTRY')
  assert.deepEqual(dialog.availableCountries, ['Беларусь', 'Spain'])
})

test('a property type supplied early is remembered for later selection', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя, нужна квартира' }],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'NEED_COUNTRY')
  assert.deepEqual(dialog.availableCountries, ['Беларусь', 'Spain'])
  assert.equal(dialog.propertyTypeLabel, 'квартира')
  assert.equal(dialog.hasCity, false)
})

test('after country asks only cities inside selected country', () => {
  const dialog = analyzeConversation(
    [
      { sender: 'user', text: 'для себя, нужна квартира' },
      { sender: 'assistant', text: 'В какой стране?' },
      { sender: 'user', text: 'Беларусь' },
    ],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'NEED_CITY')
  assert.equal(dialog.countryLabel, 'Беларусь')
  assert.deepEqual(dialog.availableCities, ['Минск', 'Гомель'])
  assert.ok(!dialog.availableCities.includes('Barcelona'))
})

test('after city asks property type available in that city', () => {
  const dialog = analyzeConversation(
    [{ sender: 'user', text: 'для себя, Беларусь, Минск' }],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'NEED_PROPERTY_TYPE')
  assert.equal(dialog.availablePropertyTypesLabel, 'квартиры, дома')
})

test('shows listings after country and city when there are five or fewer', () => {
  const dialog = analyzeConversation(
    [
      { sender: 'user', text: 'для себя, нужна квартира' },
      { sender: 'assistant', text: 'В какой стране?' },
      { sender: 'user', text: 'Беларусь' },
      { sender: 'assistant', text: 'В каком городе?' },
      { sender: 'user', text: 'Минск' },
    ],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'SHOW_LISTINGS')
  assert.equal(dialog.countryLabel, 'Беларусь')
  assert.equal(dialog.cityLabel, 'Минск')
  assert.equal(dialog.readyForListings, true)
  assert.equal(dialog.needsBudget, false)
})

test('asks budget only when more than five objects remain in the city', () => {
  const crowdedCatalog = Array.from({ length: 6 }, (_, index) => ({
    id: index + 20,
    location: 'Беларусь, Минск',
    property_type: 'apartment',
    price: 100000 + index * 10000,
  }))
  const withoutBudget = analyzeConversation(
    [{ sender: 'user', text: 'для себя, Беларусь, Минск, квартира' }],
    'ru',
    {},
    { catalog: crowdedCatalog },
  )
  assert.equal(withoutBudget.stage, 'NEED_BUDGET')
  assert.equal(withoutBudget.matchingLocationCount, 6)

  const withBudget = analyzeConversation(
    [{ sender: 'user', text: 'для себя, Беларусь, Минск, квартира, бюджет до 130 тысяч' }],
    'ru',
    {},
    { catalog: crowdedCatalog },
  )
  assert.equal(withBudget.stage, 'SHOW_LISTINGS')
})

test('does not accept a city outside the selected country', () => {
  const dialog = analyzeConversation(
    [
      { sender: 'user', text: 'для себя, нужна квартира' },
      { sender: 'user', text: 'Беларусь' },
      { sender: 'user', text: 'Barcelona' },
    ],
    'ru',
    {},
    { catalog: hierarchicalCatalog },
  )
  assert.equal(dialog.stage, 'NEED_CITY')
  assert.equal(dialog.hasCity, false)
})
