import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const compareSource = await readFile(new URL('./Compare.jsx', import.meta.url), 'utf8')
const calculatorSource = await readFile(new URL('./InvestmentCalculator.jsx', import.meta.url), 'utf8')
const calculatorCss = await readFile(new URL('./InvestmentCalculator.css', import.meta.url), 'utf8')

test('comparison persists its pair and sends the selected property through router state', () => {
  assert.match(compareSource, /writeInvestorScenario/)
  assert.match(compareSource, /propertyKeys:\s*\[pair\.left\.key,\s*pair\.right\.key\]/)
  assert.match(compareSource, /calculatorFromProperty/)
  assert.match(compareSource, /calculatorSelectedKey/)
})

test('smart investor prefers router property data and restores a safe session scenario', () => {
  assert.match(calculatorSource, /readInvestorScenario/)
  assert.match(calculatorSource, /location\.state\?\.calculatorFromProperty/)
  assert.match(calculatorSource, /investorScenario\?\.selectedKey/)
  assert.match(calculatorSource, /favoriteAuctions\.find/)
})

test('comparison context is visible and can be cleared on mobile', () => {
  assert.match(calculatorSource, /Сценарий из сравнения/)
  assert.match(calculatorSource, /2 объекта/)
  assert.match(calculatorSource, /clearInvestorScenario/)
  assert.match(calculatorCss, /\.calc-context-banner/)
  assert.match(calculatorCss, /min-height:\s*var\(--buyer-touch\)/)
})

