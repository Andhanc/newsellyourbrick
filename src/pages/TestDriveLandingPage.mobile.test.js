import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./TestDriveLandingPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./TestDriveLandingPage.css', import.meta.url), 'utf8')

test('mobile test-drive landing keeps the commercial buyer hierarchy', () => {
  assert.match(source, /BuyerEmptyState/)
  assert.match(css, /\.test-drive-story__button[\s\S]*var\(--buyer-teal-deep\)/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.test-drive-hero__shade/)
})

test('test-drive cards preserve touch and type readability on phones', () => {
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.test-drive-card__favorite[\s\S]*width:\s*44px[\s\S]*height:\s*44px/)
  assert.match(css, /\.test-drive-card__body > button[\s\S]*font-size:\s*0?\.78rem/)
  assert.match(css, /@media \(max-width: 374px\)[\s\S]*grid-template-columns:\s*1fr/)
})
