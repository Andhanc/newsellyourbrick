import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLocalizedCountryName,
  getLocalizedCountryLabelFromOption,
  resolveCountryIso,
} from './localizeCountryName.js'

test('resolves ISO from code, RU name and catalog key', () => {
  assert.equal(resolveCountryIso('GB'), 'GB')
  assert.equal(resolveCountryIso('Великобритания'), 'GB')
  assert.equal(resolveCountryIso('uk'), 'GB')
  assert.equal(resolveCountryIso('spain'), 'ES')
})

test('localizes country names for UI locales', () => {
  assert.equal(getLocalizedCountryName('GB', 'en'), 'United Kingdom')
  assert.equal(getLocalizedCountryName('Великобритания', 'en'), 'United Kingdom')
  assert.equal(getLocalizedCountryName('uk', 'de'), 'Vereinigtes Königreich')
  assert.equal(getLocalizedCountryName('spain', 'pl'), 'Hiszpania')
})

test('localizes composite phone labels', () => {
  assert.equal(getLocalizedCountryName('США/Канада', 'en'), 'United States/Canada')
})

test('localizes location option by catalog key', () => {
  assert.equal(
    getLocalizedCountryLabelFromOption({ key: 'spain', label: 'Испания' }, 'fr'),
    'Espagne',
  )
})
