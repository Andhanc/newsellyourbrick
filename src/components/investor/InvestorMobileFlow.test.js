import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try { return await readFile(url, 'utf8') } catch { return '' }
}

const header = await readOrEmpty(new URL('./InvestorMobileStepHeader.jsx', import.meta.url))
const headerCss = await readOrEmpty(new URL('./InvestorMobileStepHeader.css', import.meta.url))
const result = await readOrEmpty(new URL('./InvestorMobileResultCard.jsx', import.meta.url))
const resultCss = await readOrEmpty(new URL('./InvestorMobileResultCard.css', import.meta.url))
const page = await readOrEmpty(new URL('../../pages/InvestmentCalculator.jsx', import.meta.url))
const pageCss = await readOrEmpty(new URL('../../pages/InvestmentCalculator.css', import.meta.url))

test('mobile investor header explains the three-step decision path', () => {
  assert.match(header, /Объект/)
  assert.match(header, /Цель/)
  assert.match(header, /Результат/)
  assert.match(header, /aria-current/)
  assert.match(header, /progress/)
  assert.match(headerCss, /var\(--buyer-teal/)
})

test('mobile investor result separates deterministic outcome, assumptions and risk', () => {
  assert.match(result, /Базовый сценарий/)
  assert.match(result, /Ваш капитал/)
  assert.match(result, /Доходность/)
  assert.match(result, /Денежный поток/)
  assert.match(result, /Что учтено/)
  assert.match(result, /Риск/)
  assert.match(resultCss, /var\(--buyer-mint\)/)
})

test('calculator uses object-goal-result order on mobile and preserves desktop flow', () => {
  assert.match(page, /useMobileLayout\(768\)/)
  assert.match(page, /InvestorMobileStepHeader/)
  assert.match(page, /InvestorMobileResultCard/)
  assert.match(page, /showSourceStep/)
  assert.match(page, /showStrategyStep/)
  assert.match(pageCss, /\.calc-mobile-sticky-action/)
  assert.match(pageCss, /padding-bottom:\s*calc\([^)]*safe-area-inset-bottom/)
})

test('mobile object and goal steps collect the minimum decision inputs before results', () => {
  assert.match(page, /calc-mobile-object-input/)
  assert.match(page, /Цена покупки/)
  assert.match(page, /calc-mobile-goal-inputs/)
  assert.match(page, /Горизонт/)
  assert.match(page, /Расходы при покупке/)
})

test('numeric investment inputs expose mobile keyboard and bounds', () => {
  assert.match(page, /inputMode="decimal"/)
  assert.match(page, /min="0"/)
  assert.match(page, /step="any"/)
})
