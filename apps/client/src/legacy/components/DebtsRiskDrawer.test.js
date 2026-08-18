import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const drawer = await readFile(new URL('./DebtsRiskDrawer.jsx', import.meta.url), 'utf8')
const debts = await readFile(new URL('../pages/Debts.jsx', import.meta.url), 'utf8')

test('debts risk details open in a bottom drawer instead of flipping the card', () => {
  assert.match(debts, /import DebtsRiskDrawer from '..\/components\/DebtsRiskDrawer'/)
  assert.match(debts, /<DebtsRiskDrawer/)
  assert.match(debts, /setOpenRiskCard\(card.id\)/)
  assert.match(debts, /isFlipped=\{false\}/)
  assert.doesNotMatch(debts, /isFlipped=\{openRiskCard/)
})

test('risk drawer uses a swipeable bottom sheet with dialog semantics', () => {
  assert.match(drawer, /role="dialog"/)
  assert.match(drawer, /useBottomSheetDrag/)
  assert.match(drawer, /useDrawerDismiss/)
  assert.match(drawer, /debts-risk-drawer__handle-pill/)
})
