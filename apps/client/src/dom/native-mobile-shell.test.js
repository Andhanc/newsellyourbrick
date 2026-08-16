import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const screenSource = await readFile(new URL('./public-page-screen.tsx', import.meta.url), 'utf8')
const domSource = await readFile(new URL('./public-page.dom.tsx', import.meta.url), 'utf8')
const shellCss = await readFile(new URL('./legacy-public-shell.css', import.meta.url), 'utf8')
const profileSource = await readFile(new URL('../legacy/pages/TestPage.jsx', import.meta.url), 'utf8')
const roleSwitchSource = await readFile(
  new URL('../legacy/hooks/useRoleSwitchFlow.js', import.meta.url),
  'utf8',
)

test('profile save celebration invokes the native Android vibration bridge once per opening', () => {
  assert.match(screenSource, /Vibration\.vibrate\(\[0, 350, 120, 350, 120, 450, 120, 450\], false\)/)
  assert.match(domSource, /onProfileSavedVibration/)
  assert.match(profileSource, /profileCelebrationVibrationStartedRef/)
  assert.match(profileSource, /triggerNativeProfileSavedVibration\(\)/)
  assert.match(profileSource, /\[showProfileCompleteCelebration\]/)
})

test('native Expo pages suppress only the website footer', () => {
  assert.match(
    shellCss,
    /\.expo-public-page #site-footer,[\s\S]*\.expo-public-page \.footer,[\s\S]*display:\s*none !important/,
  )
})

test('native role switching adopts the new backend session before routing', () => {
  assert.match(domSource, /onSwitchSession/)
  assert.match(roleSwitchSource, /hasNativeSessionSwitch\(\)/)
  assert.match(roleSwitchSource, /await switchNativeSession\(/)
  assert.match(roleSwitchSource, /authToken:\s*result\.authToken \|\| null/)
})
