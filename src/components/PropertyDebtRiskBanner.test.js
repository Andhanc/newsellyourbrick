import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./PropertyDebtRiskBanner.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PropertyDebtRiskBanner.css', import.meta.url), 'utf8')

test('renders one interactive risk card using the property debt severity', () => {
  assert.match(component, /getDebtRiskPresentation/)
  assert.match(component, /debt-risk-banner--\$\{risk\.tone\}/)
  assert.match(component, /risk\.label/)
  assert.match(component, /risk\.description/)
  assert.match(component, /DebtProModal/)
  assert.match(component, /Нажмите/)
})

test('matches the compact colored card reference on phones', () => {
  assert.match(css, /min-height:\s*104px/)
  assert.match(css, /grid-template-columns:\s*56px minmax\(0, 1fr\) auto/)
  assert.match(css, /--debt-risk-color:\s*#d99400/)
  assert.match(css, /debt-risk-banner--high/)
  assert.match(css, /debt-risk-banner--low/)
  assert.match(css, /@media \(max-width: 360px\)/)
})
