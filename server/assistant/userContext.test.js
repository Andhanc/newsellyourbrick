import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildComparisonReadinessReply,
  formatUserContextForPrompt,
  sanitizeAssistantUserContext,
} from './userContext.js'

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
