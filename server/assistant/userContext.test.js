import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCabinetSnapshotReply,
  buildComparisonReadinessReply,
  formatUserContextForPrompt,
  isCabinetPersonalQuery,
  sanitizeAssistantUserContext,
} from './userContext.js'
import { classifyScenario, SCENARIOS } from './intentGate.js'

test('sanitizes personal context and excludes contact and document fields', () => {
  const context = sanitizeAssistantUserContext({
    authenticated: true,
    profile: {
      firstName: 'Анна',
      lastName: 'Иванова',
      country: 'Испания',
      city: 'Малага',
      role: 'buyer',
      email: 'private@example.com',
      phone: '+34123456789',
      passport: 'AA000000',
    },
    favorites: {
      count: 1,
      items: [{ propertyId: 42, title: 'Casa Azul', sourceTable: 'properties' }],
    },
    documents: [{ name: 'passport.pdf', text: 'secret' }],
  })

  assert.equal(context.profile.firstName, 'Анна')
  assert.equal(context.profile.city, 'Малага')
  assert.equal(context.favorites.count, 1)
  const serialized = JSON.stringify(context)
  assert.doesNotMatch(serialized, /private@example\.com|123456789|passport|secret/i)
})

test('comparison readiness requires one more favorite when only one exists', () => {
  const reply = buildComparisonReadinessReply({
    authenticated: true,
    favorites: { count: 1, items: [{ propertyId: 42, title: 'Casa Azul' }] },
  }, 'ru')

  assert.match(reply.text, /Casa Azul/)
  assert.match(reply.text, /ещё один объект/)
  assert.deepEqual(reply.navigation.map((item) => item.path), ['/favorites', '/auction'])
  assert.equal(reply.needsMoreInfo, true)
})

test('comparison readiness lets the model compare two favorites', () => {
  assert.equal(buildComparisonReadinessReply({
    authenticated: true,
    favorites: {
      count: 2,
      items: [{ title: 'A' }, { title: 'B' }],
    },
  }, 'ru'), null)
})

test('prompt treats unauthenticated personal data as unavailable', () => {
  assert.match(formatUserContextForPrompt({ authenticated: false }), /не авторизован/)
})

test('cabinet personal questions are detected and not treated as property search', () => {
  assert.equal(isCabinetPersonalQuery('Сколько у меня на балансе?'), true)
  assert.equal(isCabinetPersonalQuery('Какие у меня объекты в избранном?'), true)
  assert.equal(isCabinetPersonalQuery('Мои бронирования test-drive'), true)
  assert.equal(isCabinetPersonalQuery('расскажи про мои виллы которые у меня есть'), true)
  assert.equal(isCabinetPersonalQuery('нет, про виллы которые у меня есть в кабинете'), true)
  assert.equal(isCabinetPersonalQuery('а какие типы недвижимости у меня опубликованы'), true)
  assert.equal(isCabinetPersonalQuery('мои опубликованные объекты'), true)
  assert.equal(
    isCabinetPersonalQuery('расскажи про объекты которые у меня есть и у которых до аукциона меньше всего времени'),
    true,
  )
  assert.equal(isCabinetPersonalQuery('покажи виллы в Испании'), false)
  assert.equal(classifyScenario('Сколько у меня на балансе?').scenario, SCENARIOS.PLATFORM_HELP)
  assert.equal(classifyScenario('мои объекты').scenario, SCENARIOS.PLATFORM_HELP)
  assert.equal(classifyScenario('расскажи про мои виллы которые у меня есть').scenario, SCENARIOS.PLATFORM_HELP)
  assert.equal(classifyScenario('а какие типы недвижимости у меня опубликованы').scenario, SCENARIOS.PLATFORM_HELP)
  assert.equal(
    classifyScenario('расскажи про объекты которые у меня есть и у которых до аукциона меньше всего времени').scenario,
    SCENARIOS.PLATFORM_HELP,
  )
})

test('cabinet snapshot reply reports wallet and bookings from context', () => {
  const reply = buildCabinetSnapshotReply({
    authenticated: true,
    wallet: { depositAmount: 3000, currency: 'EUR' },
    bookings: {
      count: 1,
      items: [{ propertyId: 94, title: 'Sea View', startDate: '2026-11-01', endDate: '2026-11-03' }],
    },
    favorites: { count: 0, items: [] },
  }, 'Сколько у меня на балансе и какие бронирования?', 'ru')

  assert.match(reply.text, /3000 EUR/)
  assert.match(reply.text, /Бронирования test-drive: 1/)
  assert.ok(reply.navigation.some((item) => item.path === '/wallet'))
  assert.ok(reply.navigation.some((item) => item.path === '/property/94'))
  assert.ok(reply.navigation.some((item) => item.path === '/profile?bookings=1'))
})

test('owned properties get cabinet analytics links sorted by nearest auction', () => {
  const reply = buildCabinetSnapshotReply({
    authenticated: true,
    ownedProperties: {
      count: 2,
      items: [
        { id: 10, title: 'Later Auction', auctionEndDate: '2026-12-20T12:00:00.000Z' },
        { id: 11, title: 'Soon Auction', auctionEndDate: '2026-10-10T12:00:00.000Z' },
      ],
    },
    favorites: { count: 0, items: [] },
    bookings: { count: 0, items: [] },
  }, 'расскажи про мои объекты у которых ближайший аукцион', 'ru')

  assert.match(reply.text, /Ваши объявления: 2/)
  assert.equal(reply.navigation[0].path, '/owner-test/property-analytics/11')
  assert.equal(reply.navigation[1].path, '/owner-test/property-analytics/10')
  assert.ok(reply.navigation.some((item) => item.path === '/owner-test/properties'))
})
