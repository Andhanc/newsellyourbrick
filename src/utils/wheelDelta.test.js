import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { wheelDeltaYInPixels } from './wheelDelta.js'

test('normalizes wheel pixels, lines and pages', () => {
  assert.equal(wheelDeltaYInPixels({ deltaY: 30, deltaMode: 0 }, 800), 30)
  assert.equal(wheelDeltaYInPixels({ deltaY: 3, deltaMode: 1 }, 800), 48)
  assert.equal(wheelDeltaYInPixels({ deltaY: -1, deltaMode: 2 }, 800), -800)
})

test('web and legacy wheel conversion stay identical', () => {
  const web = readFileSync(new URL('./wheelDelta.js', import.meta.url), 'utf8')
  const legacy = readFileSync(
    new URL('../../apps/client/src/legacy/utils/wheelDelta.js', import.meta.url), 'utf8',
  )
  assert.equal(web, legacy)
})
