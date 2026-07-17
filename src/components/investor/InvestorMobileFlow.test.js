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
const hero = await readOrEmpty(new URL('./InvestorMobileHero.jsx', import.meta.url))
const heroCss = await readOrEmpty(new URL('./InvestorMobileHero.css', import.meta.url))
const assumptions = await readOrEmpty(new URL('./InvestorAssumptionsSheet.jsx', import.meta.url))
const assumptionsCss = await readOrEmpty(new URL('./InvestorAssumptionsSheet.css', import.meta.url))
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
  assert.match(result, /yieldLabel/)
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
  assert.match(page, /Ожидаемая аренда в год/)
  assert.match(page, /requiresRentalIncome/)
  assert.match(page, /Доходность за период/)
  assert.match(page, /Доходность в год/)
})

test('numeric investment inputs expose mobile keyboard and bounds', () => {
  assert.match(page, /inputMode="decimal"/)
  assert.match(page, /min="0"/)
  assert.match(page, /step="any"/)
})

test('mobile investor opens with an editorial property hero and a truthful scenario disclaimer', () => {
  assert.match(hero, /smart-investor-hero-mobile\.png/)
  assert.match(hero, /сценар/i)
  assert.match(hero, /не гарант/i)
  assert.match(hero, /ShieldCheck/)
  assert.match(heroCss, /object-fit:\s*cover/)
  assert.match(heroCss, /display:\s*none/)
  assert.match(heroCss, /@media \(max-width:\s*768px\)/)
})

test('result keeps advanced assumptions in an accessible guided sheet on mobile', () => {
  assert.match(page, /InvestorAssumptionsSheet/)
  assert.match(page, /assumptionsOpen/)
  assert.match(page, /setAssumptionsOpen\(true\)/)
  assert.match(assumptions, /BuyerSheetShell/)
  assert.match(assumptions, /Параметры сценария/)
  assert.match(assumptions, /Расчёт обновляется сразу/)
  assert.match(assumptionsCss, /min-height:\s*var\(--buyer-touch\)/)
})

test('mobile result provides a real next property action without claiming guaranteed returns', () => {
  assert.match(result, /onOpenAssumptions/)
  assert.match(result, /onOpenProperty/)
  assert.match(result, /Среднее за месяц периода/)
  assert.doesNotMatch(result, /гарантирован/i)
  assert.match(resultCss, /min-height:\s*var\(--buyer-touch\)/)
})

test('phone layout is clipped to the viewport while desktop calculator remains untouched', () => {
  assert.match(pageCss, /overflow-x:\s*clip/)
  assert.match(pageCss, /\.calc-step3-sidebar\.calc-dashboard__form\s*\{[^}]*display:\s*none/s)
  assert.match(pageCss, /@media \(min-width:\s*769px\)/)
})
