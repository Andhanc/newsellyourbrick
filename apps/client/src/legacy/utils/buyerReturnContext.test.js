import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consumeBuyerReturnContext,
  readBuyerReturnContext,
  validateBuyerReturnPath,
  writeBuyerReturnContext,
} from './buyerReturnContext.js'
import { isSafeWalletFromPath } from './walletNavigation.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
}

test('accepts only explicit buyer return routes and preserves encoded queries', () => {
  assert.equal(validateBuyerReturnPath('/property/42?from=%2Fcompare'), '/property/42?from=%2Fcompare')
  assert.equal(validateBuyerReturnPath('/auction?city=Madrid'), '/auction?city=Madrid')
  assert.equal(validateBuyerReturnPath('/compare#results'), '/compare#results')
  assert.equal(validateBuyerReturnPath('/favorites'), '/favorites')
  assert.equal(validateBuyerReturnPath('/calculator'), '/calculator')
  assert.equal(validateBuyerReturnPath('/deposit'), '/deposit')
})

test('rejects external, protocol-relative, javascript and lookalike paths', () => {
  for (const input of [
    'https://attacker.example/property/1',
    '//attacker.example/property/1',
    'javascript:alert(1)',
    '/auctioneer',
    '/property/',
    '/admin',
    '/\\attacker.example',
  ]) {
    assert.equal(validateBuyerReturnPath(input), '/auction')
  }
})

test('stores valid context and consumes it exactly once', () => {
  const storage = memoryStorage()
  assert.equal(writeBuyerReturnContext('/compare?pair=1%3A2', { storage }), true)
  assert.equal(readBuyerReturnContext({ storage }), '/compare?pair=1%3A2')
  assert.equal(consumeBuyerReturnContext({ storage }), '/compare?pair=1%3A2')
  assert.equal(consumeBuyerReturnContext({ storage }), '/auction')
})

test('invalid writes and blocked storage fall back safely', () => {
  const storage = memoryStorage()
  assert.equal(writeBuyerReturnContext('https://attacker.example', { storage }), false)
  assert.equal(readBuyerReturnContext({ storage }), '/auction')

  const broken = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  assert.equal(writeBuyerReturnContext('/compare', { storage: broken }), false)
  assert.equal(consumeBuyerReturnContext({ storage: broken }), '/auction')
})

test('wallet entry guard prevents every deposit self-return variant', () => {
  assert.equal(isSafeWalletFromPath('/deposit'), false)
  assert.equal(isSafeWalletFromPath('/deposit?source=property'), false)
  assert.equal(isSafeWalletFromPath('/property/42'), true)
})
