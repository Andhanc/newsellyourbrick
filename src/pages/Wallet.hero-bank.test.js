import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const wallet = await readFile(new URL('./Wallet.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./Wallet.bank.css', import.meta.url), 'utf8')

test('deposit page matches the supplied blue banking reference', () => {
  assert.match(wallet, /wallet-bank/)
  assert.match(wallet, /wallet-bank__hero/)
  assert.match(wallet, /wallet-bank__cta-row/)
  assert.match(wallet, /wallet-bank__alert/)
  assert.match(wallet, /walletPage_auctionAccessCta/)
  assert.match(wallet, /FiMaximize/)
  assert.match(wallet, /wallet-bank__quick-grid/)
  assert.match(wallet, /wallet-bank__tx-list/)
  assert.match(wallet, /Wallet\.bank\.css/)
  assert.doesNotMatch(wallet, /AlertTriangle/)
  assert.doesNotMatch(wallet, /wallet-bank__coin/)
  assert.doesNotMatch(wallet, /DepositZeroState/)
  assert.match(css, /#4ecdd6/i)
  assert.match(css, /\.wallet-bank__hero::after/)
  assert.match(css, /\.wallet-bank__body[\s\S]*border-radius:\s*30px 30px 0 0/)
})

test('mobile deposit hides payment rails and keeps a floating auction action', () => {
  assert.doesNotMatch(wallet, /walletPage_paymentMethodsTitle/)
  assert.doesNotMatch(wallet, /wallet-bank__payments/)
  assert.doesNotMatch(wallet, /wallet-bank__payment-brand--visa/)
  assert.match(css, /\.wallet-bank__auction-action[\s\S]*0 24px 42px/)
  assert.match(css, /\.wallet-bank__auction-action[\s\S]*background:\s*#fff/)
  assert.doesNotMatch(css, /@keyframes wallet-bank__auction-action/)
})

test('wallet header actions use stable destinations and the notifications drawer', () => {
  assert.match(wallet, /navigate\(getCabinetProfilePath\(\)\)/)
  assert.match(wallet, /<NotificationsBell variant="wallet" \/>/)
  assert.match(wallet, /FiMenu/)
  assert.match(wallet, /wallet-bank__menu-popover/)
  assert.doesNotMatch(wallet, /navigate\('\/search-results'\)/)
  assert.ok(wallet.indexOf('<NotificationsBell variant="wallet" />') < wallet.indexOf('wallet-bank__menu-wrap'))
  assert.doesNotMatch(wallet, /className="wallet-bank__identity" onClick=\{handleWalletBack\}/)
})
