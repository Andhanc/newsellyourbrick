import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const presetSource = await readFile(
  new URL('./ownerCabinetWelcomePresets.js', import.meta.url),
  'utf8',
)

test('active owner welcome uses a compact 3-step preset', () => {
  assert.match(presetSource, /OWNER_CABINET_WELCOME_PRESET\s*=\s*\{/)
  assert.match(presetSource, /translationPrefix:\s*'ownerWelcome'/)
  assert.match(presetSource, /stepCount:\s*3/)
  assert.match(presetSource, /owner-onboarding-step-4-start\.webp/)
  assert.match(presetSource, /owner-onboarding-step-1-cabinet\.webp/)
  assert.match(presetSource, /owner-onboarding-step-2-analytics\.webp/)
  assert.match(presetSource, /buyerStyled:\s*true/)
})

test('full 4-step owner tour preset stays available for future use', () => {
  assert.match(presetSource, /OWNER_CABINET_WELCOME_PRESET_FULL\s*=\s*\{/)
  assert.match(presetSource, /translationPrefix:\s*'ownerTest'/)
  assert.match(presetSource, /stepCount:\s*4/)
  assert.match(presetSource, /OWNER_ONBOARDING_IMAGES/)
})
