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

test('mobile deposit lists payment rails and elevates the auction action', () => {
  assert.match(wallet, /walletPage_paymentMethodsTitle/)
  assert.match(wallet, /Visa/)
  assert.match(wallet, /Mastercard/)
  assert.match(wallet, /USDT/)
  assert.match(wallet, /USDC/)
  assert.match(wallet, /wallet-bank__auction-action/)
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*\.wallet-bank__payments/)
  assert.match(css, /\.wallet-bank__auction-action[\s\S]*0 24px 42px/)
  assert.match(css, /\.wallet-bank__auction-action[\s\S]*background:\s*#fff/)
  assert.match(css, /\.wallet-bank__payments[\s\S]*background:\s*transparent/)
  assert.ok(wallet.indexOf('wallet-bank__auction-action') < wallet.indexOf('wallet-bank__payments'))
})

test('legacy wallet header actions use stable destinations', () => {
  assert.match(wallet, /navigate\(getCabinetProfilePath\(\)\)/)
  assert.match(wallet, /<NotificationsBell variant="wallet" \/>/)
  assert.match(wallet, /FiMenu/)
  assert.match(wallet, /wallet-bank__menu-popover/)
  assert.doesNotMatch(wallet, /navigate\('\/search-results'\)/)
  assert.ok(wallet.indexOf('<NotificationsBell variant="wallet" />') < wallet.indexOf('wallet-bank__menu-wrap'))
})
