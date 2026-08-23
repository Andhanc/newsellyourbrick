import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const summary = await readFile(new URL('./CompareDecisionSummary.jsx', import.meta.url), 'utf8').catch(() => '')

test('decision summary shows point-win percentages for both listings', () => {
  assert.match(summary, /comparePage_decisionTitle/)
  assert.match(summary, /formatComparisonDecision/)
  assert.match(summary, /compare-decision__bar/)
  assert.match(summary, /comparePage_scorePoints/)
  assert.match(summary, /comparePage_scoreBarAria/)
  assert.match(summary, /leftPct/)
  assert.match(summary, /rightPct/)
  assert.doesNotMatch(summary, /объективных полей/i)
  assert.doesNotMatch(summary, /балл[а-я.]/i)
})

test('decision summary requires an explicit calculator object', () => {
  assert.match(summary, /onOpenCalculator\('left'\)/)
  assert.match(summary, /onOpenCalculator\('right'\)/)
  assert.match(summary, /comparePage_decisionDisclaimer/)
})

test('decision summary keeps both properties identifiable and both actions tappable', () => {
  assert.match(summary, /getPropertyCardImage/)
  assert.match(summary, /compare-decision__property/)
  assert.match(summary, /compare-decision__action/)
  assert.match(summary, /comparePage_signalsLabel/)
})
