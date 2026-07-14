import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try { return await readFile(url, 'utf8') } catch { return '' }
}

const source = await readOrEmpty(new URL('./DepositZeroState.jsx', import.meta.url))
const css = await readOrEmpty(new URL('./DepositZeroState.css', import.meta.url))
const wallet = await readOrEmpty(new URL('../../pages/Wallet.jsx', import.meta.url))

test('zero deposit state is persuasive without promising financial outcomes', () => {
  assert.match(source, /Депозит открывает участие/)
  assert.match(source, /Ставки и покупка/)
  assert.match(source, /Бронирование просмотра/)
  assert.match(source, /Контроль средств/)
  assert.match(source, /возврат/iu)
  assert.doesNotMatch(source, /гарантированн.*доход/iu)
})

test('preview is truthfully labelled and the state has one primary top-up action', () => {
  assert.match(source, /Пример после пополнения/)
  assert.match(source, /deposit-zero__preview--blurred/)
  assert.match(source, /deposit-zero-wallet\.webp/)
  assert.equal((source.match(/deposit-zero__primary/g) || []).length, 1)
  assert.match(source, /onTopUp/)
  assert.match(css, /filter:\s*blur/)
  assert.match(css, /var\(--buyer-mint\)/)
})

test('wallet renders zero state only after a successful deposit response resolved to zero', () => {
  assert.match(wallet, /depositResolved/)
  assert.match(wallet, /setDepositResolved\(true\)/)
  assert.match(wallet, /depositResolved\s*&&\s*depositAmount\s*===\s*0/)
  assert.match(wallet, /<DepositZeroState/)
  assert.match(wallet, /setShowTopUpPicker\(true\)/)
})

