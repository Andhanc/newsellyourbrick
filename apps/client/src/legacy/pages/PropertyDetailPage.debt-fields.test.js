import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./PropertyDetailPage.jsx', import.meta.url), 'utf8')

test('keeps all debt detail fields when normalizing an API property', () => {
  for (const field of [
    'debt_amount',
    'debt_other',
    'debt_severity',
    'debt_utilities',
    'debt_mortgage_pledge',
    'debt_property_taxes',
    'debt_arrest',
    'debt_inherited',
    'debt_third_party',
  ]) {
    assert.match(source, new RegExp(`${field}:\\s*prop\\.${field}`), `${field} is preserved`)
  }
})
