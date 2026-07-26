import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const wallet = await readFile(new URL('./Wallet.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./Wallet.bank.css', import.meta.url), 'utf8')

test('deposit page matches banking reference shell with tiffany hero', () => {
  assert.match(wallet, /wallet-bank/)
  assert.match(wallet, /wallet-bank__hero/)
  assert.match(wallet, /wallet-bank__cta-row/)
  assert.match(wallet, /wallet-bank__alert/)
  assert.match(wallet, /FiGift/)
  assert.match(wallet, /FiChevronRight/)
  assert.match(wallet, /wallet-bank__quick-grid/)
  assert.match(wallet, /wallet-bank__tx-list/)
  assert.match(wallet, /Wallet\.bank\.css/)
  assert.doesNotMatch(wallet, /AlertTriangle/)
  assert.doesNotMatch(wallet, /wallet-bank__coin/)
  assert.doesNotMatch(wallet, /DepositZeroState/)
  assert.match(css, /#0099A9/)
  assert.match(css, /\.wallet-bank__hero::after/)
  assert.match(css, /border-radius:\s*999px/)
})
