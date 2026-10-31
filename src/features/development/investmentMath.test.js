import test from 'node:test'
import assert from 'node:assert/strict'
import {
  investmentPayment,
  investmentShare,
  parseInvestmentAmount,
} from './investmentMath.js'
test('investment amount accepts locale separators, but rejects malformed or fractional cents', () => {
  for (const [raw, expected] of [
    ['10 000,50', 10000.5],
    ['0.01', 0.01],
    ['1\u202f000', 1000],
    ['-1', null],
    ['', null],
    ['1e3', null],
    ['1.234', null],
    ['Infinity', null],
    ['0', null],
  ])
    assert.equal(parseInvestmentAmount(raw), expected, raw)
})
test('deposit split conserves cents, respects balance and the existing checkout cap', () => {
  assert.deepEqual(investmentPayment(5000, 10000, true), {
    walletEur: 3000,
    cardAmount: 2000,
  })
  assert.deepEqual(investmentPayment(100, 1000, true), {
    walletEur: 100,
    cardAmount: 0,
  })
  assert.deepEqual(investmentPayment(100, 12, false), {
    walletEur: 0,
    cardAmount: 100,
  })
  assert.deepEqual(investmentPayment(100, 99.9, true), {
    walletEur: 99.5,
    cardAmount: 0.5,
  })
  assert.deepEqual(investmentPayment(100, 50, true, 1.2), {
    walletEur: 50,
    cardAmount: 40,
  })
  assert.equal(investmentShare(2500, 10000), 25)
  assert.equal(investmentShare(100, 0), 0)
})
