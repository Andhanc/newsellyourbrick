import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const summary = await readFile(new URL('./CompareDecisionSummary.jsx', import.meta.url), 'utf8').catch(() => '')

test('decision summary presents signals without claiming an objective winner', () => {
  assert.match(summary, /Сигналы сравнения/)
  assert.match(summary, /ориентир/i)
  assert.doesNotMatch(summary, /объективных полей/i)
  assert.doesNotMatch(summary, /впереди/i)
  assert.doesNotMatch(summary, /балл[а-я.]/i)
})

test('decision summary requires an explicit calculator object', () => {
  assert.match(summary, /onOpenCalculator\('left'\)/)
  assert.match(summary, /onOpenCalculator\('right'\)/)
  assert.match(summary, /Не является гарантией/)
})

test('decision summary keeps both properties identifiable and both actions tappable', () => {
  assert.match(summary, /getPropertyCardImage/)
  assert.match(summary, /compare-decision__property/)
  assert.match(summary, /compare-decision__action/)
  assert.match(summary, /Объект 1/)
  assert.match(summary, /Объект 2/)
})
