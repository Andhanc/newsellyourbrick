import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearInvestorScenario,
  readInvestorScenario,
  writeInvestorScenario,
} from './investorScenarioContext.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
  }
}

const NOW = Date.UTC(2026, 6, 14, 10, 0, 0)

test('stores a versioned, allowlisted comparison scenario without financial values', () => {
  const storage = memoryStorage()
  const written = writeInvestorScenario({
    source: 'compare',
    propertyKeys: ['properties_apartments:17', 'properties_apartments:42'],
    selectedKey: 'properties_apartments:17',
    price: 9_999_999,
    returnTo: 'https://attacker.example',
  }, { storage, now: () => NOW })

  assert.deepEqual(written, {
    version: 1,
    source: 'compare',
    propertyKeys: ['properties_apartments:17', 'properties_apartments:42'],
    selectedKey: 'properties_apartments:17',
    createdAt: NOW,
  })
  assert.deepEqual(readInvestorScenario({ storage, now: () => NOW + 1_000 }), written)
  assert.equal(JSON.stringify(written).includes('9999999'), false)
  assert.equal(JSON.stringify(written).includes('attacker'), false)
})

test('requires exactly two unique bounded safe property keys', () => {
  const storage = memoryStorage()
  const options = { storage, now: () => NOW }

  assert.equal(writeInvestorScenario({ source: 'compare', propertyKeys: ['one'] }, options), null)
  assert.equal(writeInvestorScenario({ source: 'compare', propertyKeys: ['same', 'same'] }, options), null)
  assert.equal(writeInvestorScenario({ source: 'compare', propertyKeys: ['one', 'two', 'three'] }, options), null)
  assert.equal(writeInvestorScenario({ source: 'compare', propertyKeys: ['safe:1', 'x'.repeat(161)] }, options), null)
  assert.equal(writeInvestorScenario({ source: 'compare', propertyKeys: ['safe:1', 'https://attacker.example'] }, options), null)
  assert.equal(writeInvestorScenario({ source: 'other', propertyKeys: ['safe:1', 'safe:2'] }, options), null)
})

test('rejects selected keys outside the pair', () => {
  const storage = memoryStorage()
  assert.equal(writeInvestorScenario({
    source: 'compare',
    propertyKeys: ['safe:1', 'safe:2'],
    selectedKey: 'safe:3',
  }, { storage, now: () => NOW }), null)
})

test('expires scenarios after thirty minutes and clears invalid storage', () => {
  const storage = memoryStorage()
  writeInvestorScenario({
    source: 'compare',
    propertyKeys: ['safe:1', 'safe:2'],
    selectedKey: 'safe:2',
  }, { storage, now: () => NOW })

  assert.ok(readInvestorScenario({ storage, now: () => NOW + 30 * 60 * 1_000 }))
  assert.equal(readInvestorScenario({ storage, now: () => NOW + 30 * 60 * 1_000 + 1 }), null)

  storage.setItem('buyerInvestorScenario', '{broken json')
  assert.equal(readInvestorScenario({ storage, now: () => NOW }), null)
  assert.equal(storage.getItem('buyerInvestorScenario'), null)
})

test('rejects unsupported versions and survives storage exceptions', () => {
  const storage = memoryStorage()
  storage.setItem('buyerInvestorScenario', JSON.stringify({
    version: 2,
    source: 'compare',
    propertyKeys: ['safe:1', 'safe:2'],
    selectedKey: 'safe:1',
    createdAt: NOW,
  }))
  assert.equal(readInvestorScenario({ storage, now: () => NOW }), null)

  const broken = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  assert.equal(writeInvestorScenario({ source: 'compare', propertyKeys: ['safe:1', 'safe:2'] }, { storage: broken }), null)
  assert.equal(readInvestorScenario({ storage: broken }), null)
  assert.doesNotThrow(() => clearInvestorScenario({ storage: broken }))
})

