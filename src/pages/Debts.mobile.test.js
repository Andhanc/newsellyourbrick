import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./Debts.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./Shares.css', import.meta.url), 'utf8')

test('debts empty results guide the buyer toward a recoverable next step', () => {
  assert.match(source, /BuyerEmptyState/)
  assert.match(source, /resetDebtsDiscovery/)
  assert.match(source, /Показать все долги/)
  assert.match(source, /Смотреть другие объекты/)
  assert.match(source, /debts-empty-illustration\.png/)
  assert.doesNotMatch(source, /<div className="shares-no-results">/)
  assert.match(css, /\.debts-empty-guided[^}]*grid-column:\s*1 \/ -1/)
})
