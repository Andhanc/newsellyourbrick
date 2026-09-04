import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./CompareMobileMarketEstimate.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./CompareMobileMarketEstimate.css', import.meta.url), 'utf8')
const page = await readFile(new URL('../../pages/Compare.jsx', import.meta.url), 'utf8')

test('mobile market estimate is placed between comfort metrics and the price summary', () => {
  const metricsIndex = page.indexOf('<CompareMobileMetrics')
  const marketIndex = page.indexOf('<CompareMobileMarketEstimate')
  const decisionIndex = page.indexOf('<CompareDecisionSummary')
  assert.ok(metricsIndex >= 0)
  assert.ok(marketIndex > metricsIndex)
  assert.ok(decisionIndex > marketIndex)
})

test('mobile market estimate keeps calculator states and data visible', () => {
  assert.doesNotMatch(component, /comparePage_calcButton/)
  assert.doesNotMatch(component, /compare-market__run/)
  assert.match(page, /compareCalculatorStartedKeyRef\.current = pairKey[\s\S]*void runCompareCalculator\(\)/)
  assert.doesNotMatch(page, /comparePage_calcButton/)
  assert.match(component, /comparePage_calcRecommendedPrice/)
  assert.match(component, /comparePage_calcPricePerSqm/)
  assert.match(component, /comparePage_calcSources/)
  assert.match(component, /comparePage_calcNote/)
  assert.match(component, /similarProperties/)
  assert.match(component, /calcData\.left\?\.currency/)
  assert.match(component, /calcData\.right\?\.currency/)
  assert.match(component, /aria-live="polite"/)
})

test('mobile market estimate uses the buyer card language without a table', () => {
  assert.doesNotMatch(component, /<table/)
  assert.match(css, /border-radius:\s*22px/)
  assert.match(css, /\.compare-market__icon \{[\s\S]*color:\s*#ffffff/)
  assert.match(css, /var\(--buyer-cloud\)/)
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /@media\s*\(max-width:\s*360px\)/)
})
