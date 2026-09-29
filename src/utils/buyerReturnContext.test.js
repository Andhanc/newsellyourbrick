import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consumeBuyerReturnContext,
  readBuyerReturnContext,
  validateBuyerReturnPath,
  writeBuyerReturnContext,
} from './buyerReturnContext.js'
import { getWalletPropertyReturnPath, isSafeWalletFromPath, navigateToWallet } from './walletNavigation.js'

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


test('wallet property choice uses the current entry and survives a checkout reload', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = memoryStorage()
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })
  try {
    const propertyPath = '/property/seaside-villa?property_type=villa&classic=1#bids'
    writeBuyerReturnContext(propertyPath, { storage })
    assert.equal(getWalletPropertyReturnPath(undefined), propertyPath)
    assert.equal(getWalletPropertyReturnPath('/property/42?property_type=apartment'), '/property/42?property_type=apartment')
    assert.equal(getWalletPropertyReturnPath('/auction?filter=auction'), null)
    assert.equal(getWalletPropertyReturnPath('/favorites'), null)
    consumeBuyerReturnContext({ storage })
    for (const path of [undefined, '/property/', '/property/42/test-drive', '//example.com/property/42', '/property/%2Fadmin']) {
      assert.equal(getWalletPropertyReturnPath(path), null)
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous)
    else delete globalThis.sessionStorage
  }
})

test('wallet entry helpers and strategy modal remain identical in web and legacy', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const file of ['utils/buyerReturnContext.js', 'utils/walletNavigation.js', 'components/DepositStrategyModal.jsx', 'components/DepositStrategyModal.css']) {
    assert.equal(
      await readFile(new URL(`../${file}`, import.meta.url), 'utf8'),
      await readFile(new URL(`../../apps/client/src/legacy/${file}`, import.meta.url), 'utf8'),
      file,
    )
  }
})


test('deposit navigation recognizes property routes inside catalogues and preserves the listing type', () => {
  for (const prefix of ['', '/auction', '/debts', '/auction/spain/marbella', '/debts/spain/marbella', '/search-results/spain/marbella']) {
    const from = `${prefix}/property/324?property_type=villa#bids`
    const expected = '/property/324?property_type=villa#bids'
    assert.equal(validateBuyerReturnPath(from), expected)
    let navigation
    navigateToWallet((...args) => { navigation = args }, from)
    assert.equal(navigation[0], '/deposit')
    assert.equal(getWalletPropertyReturnPath(navigation[1].state.from), expected)
  }
  for (const from of ['/admin/property/324', '/auction/property/324/edit', '/auction/%2F/spain/property/324', '/auction/spain/%2e%2e/property/324']) {
    assert.equal(validateBuyerReturnPath(from, { fallback: null }), null)
  }
})

test('insufficient-deposit actions pass the selected property rather than the host page URL', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const root of ['../', '../../apps/client/src/legacy/']) {
    for (const [file, propertyName] of [['PropertyDetailClassic.jsx', 'displayProperty'], ['PropertyDetail.jsx', 'normalizedProperty']]) {
      const source = await readFile(new URL(`${root}pages/${file}`, import.meta.url), 'utf8')
      const actions = [...source.matchAll(/onGoToDeposit=\{\(\) => \{([\s\S]*?)\}\}/g)]
      assert.ok(actions.length > 0, file)
      for (const [, body] of actions) {
        const property = { id: 324, property_type: 'villa', slug: 'villa-ya-324' }
        let navigation
        const run = new Function('setIsDepositRequiredOpen', 'getPropertyDetailPath', propertyName, 'navigateToWallet', 'navigate', body)
        run(() => {}, (selected) => {
          assert.equal(selected, property)
          return '/property/villa-ya-324'
        }, property, navigateToWallet, (...args) => { navigation = args })
        assert.equal(navigation[0], '/deposit')
        assert.equal(getWalletPropertyReturnPath(navigation[1].state.from), '/property/villa-ya-324')
      }
    }
  }
})
