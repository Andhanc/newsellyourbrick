import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./hrShowcaseDebtsCards.css', import.meta.url), 'utf8')
const debtsPage = await readFile(new URL('../pages/Debts.jsx', import.meta.url), 'utf8')

test('debts listing uses shared home-style showcase cards', () => {
  assert.match(debtsPage, /hrShowcaseDebtsCards\.css/)
  assert.match(debtsPage, /hr-showcases hr-showcases--debts-listing/)
  assert.match(debtsPage, /properties-grid--auction-cards/)
  assert.match(css, /\.hr-showcases \.debts-property-card__btn[\s\S]*?var\(--hr-showcase-action\)/)
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?aspect-ratio:\s*3 \/ 2/)
})
