import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeListingLanguage } from './listingLanguage.js'

test('normalizeListingLanguage keeps supported site languages', () => {
  for (const code of ['en', 'ru', 'de', 'es', 'fr', 'pl', 'sv']) {
    assert.equal(normalizeListingLanguage(code), code)
    assert.equal(normalizeListingLanguage(`${code}-XX`), code)
  }
})

test('normalizeListingLanguage falls back to English', () => {
  assert.equal(normalizeListingLanguage(''), 'en')
  assert.equal(normalizeListingLanguage(null), 'en')
  assert.equal(normalizeListingLanguage('pt'), 'en')
})
