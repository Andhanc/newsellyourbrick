import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const summary = await readFile(new URL('./CompareDecisionSummary.jsx', import.meta.url), 'utf8').catch(() => '')
const css = await readFile(new URL('./CompareDecisionSummary.css', import.meta.url), 'utf8').catch(() => '')

test('decision summary presents both comparison percentages inside a podium', () => {
  assert.match(summary, /comparePage_decisionTitle/)
  assert.match(summary, /compare-decision__podium/)
  assert.match(summary, /compare-decision__score/)
  assert.match(summary, /comparePage_scoreBarAria/)
  assert.match(summary, /leftPct/)
  assert.match(summary, /rightPct/)
  assert.doesNotMatch(summary, /formatComparisonDecision/)
  assert.doesNotMatch(summary, /compare-decision__result/)
  assert.doesNotMatch(summary, /compare-decision__meta/)
})

test('decision summary ranks the leader first while keeping the classic second-first podium order', () => {
  assert.match(summary, /entry\.side === summary\.leader \? 1 : 2/)
  assert.match(summary, /sort\(\(a, b\) => b\.rank - a\.rank\)/)
  assert.match(summary, /compare-decision__property--rank-\$\{rank\}/)
  assert.match(summary, /rank === 1/)
  assert.match(summary, /<Crown/)
})

test('decision summary keeps both properties identifiable and opens one calculator for the leader', () => {
  assert.match(summary, /getPropertyCardImage/)
  assert.match(summary, /compare-decision__property/)
  assert.match(summary, /compare-decision__action/)
  assert.match(summary, /comparePage_objectN/)
  assert.match(summary, /const calculatorEntry = podiumEntries\.find/)
  assert.match(summary, /onOpenCalculator\(calculatorEntry\.side\)/)
  assert.doesNotMatch(summary, /onSelect/)
  assert.match(summary, /comparePage_calcThisObject/)
  assert.doesNotMatch(summary, /compare-decision__score-ring/)
})

test('podium rises with a reduced-motion fallback', () => {
  assert.match(css, /@keyframes compare-podium-rise/)
  assert.match(css, /from\s*\{[\s\S]*height:\s*0/)
  assert.match(css, /height:\s*var\(--podium-height\)/)
  assert.match(css, /animation:\s*compare-podium-rise/)
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/)
})

test('podium uses the Tiffany palette without medal colors or decorative gradients', () => {
  assert.match(css, /--compare-tiffany:\s*#4fd5ca/)
  assert.match(css, /--compare-tiffany-ink:\s*#073f3b/)
  assert.match(css, /--compare-tiffany-soft:\s*#a9e9e2/)
  assert.doesNotMatch(css, /gold|silver|bronze/i)
  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/)
})

test('results block is white and uses one black shared calculator action', () => {
  assert.match(css, /\.compare-decision\s*\{[\s\S]*background:\s*#ffffff/)
  assert.match(css, /\.compare-decision__action\s*\{[\s\S]*background:\s*#0b0b0b/)
})
