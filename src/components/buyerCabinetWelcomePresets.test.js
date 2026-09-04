import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const presetSource = await readFile(
  new URL('./buyerCabinetWelcomePresets.js', import.meta.url),
  'utf8',
)

test('active buyer welcome uses a compact 3-step preset', () => {
  assert.match(presetSource, /BUYER_CABINET_WELCOME_PRESET\s*=\s*\{/)
  assert.match(presetSource, /translationPrefix:\s*'buyerWelcome'/)
  assert.match(presetSource, /stepCount:\s*3/)
  assert.match(presetSource, /shortcuts\/subscriptions\.png/)
  assert.match(presetSource, /shortcuts\/data\.png/)
  assert.match(presetSource, /shortcuts\/deposit\.png/)
})

test('full 4-step buyer tour preset stays available for future use', () => {
  assert.match(presetSource, /BUYER_CABINET_WELCOME_PRESET_FULL\s*=\s*\{/)
  assert.match(presetSource, /translationPrefix:\s*'buyerTest'/)
  assert.match(presetSource, /stepCount:\s*4/)
  assert.match(presetSource, /BUYER_CABINET_WELCOME_IMAGES_FULL/)
})
