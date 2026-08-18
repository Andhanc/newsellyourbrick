import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./CompareInvestorResults.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./CompareInvestorResults.css', import.meta.url), 'utf8')

test('smart panel keeps both object identities and replace actions', () => {
  assert.match(source, /compare-investor__pair/)
  assert.match(source, /comparePage_object1/)
  assert.match(source, /comparePage_object2/)
  assert.match(source, /onReplace\(side\)/)
  assert.match(source, /comparePage_replaceAria/)
  assert.match(source, /getPropertyCardImage/)
})

test('smart panel compares objects by points and then by AI', () => {
  assert.match(source, /METRIC_GROUP_DEFS/)
  assert.match(source, /comparePage_groupPrice/)
  assert.match(source, /comparePage_groupProperty/)
  assert.match(source, /comparePage_groupComfort/)
  assert.match(source, /comparePage_aiGet/)
  assert.match(source, /onClick=\{onRunAi\}/)
  assert.match(source, /aiResult\.rows/)
  assert.doesNotMatch(source, /smartInvestor_dealScore/)
  assert.doesNotMatch(source, /onOpenCalculator/)
  assert.doesNotMatch(source, /<table/)
})

test('smart panel uses homepage fonts and stays in two columns on desktop', () => {
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /--site-font-family/)
  assert.match(css, /#0099a9/)
  assert.doesNotMatch(css, /Playfair Display/)
})
