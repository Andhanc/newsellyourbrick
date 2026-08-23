import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('home discover page hosts the same AI plaque as auction', () => {
  assert.match(page, /SiteChatDock/)
  assert.match(page, /wrapperClassName="md-discover-ai-floats"/)
  assert.match(page, /openAIChat/)
})

test('home AI plaque stays on screen without relying on .md custom properties', () => {
  assert.match(css, /\.md-discover-ai-floats\s*>\s*\.ai-button/)
  assert.match(css, /env\(safe-area-inset-bottom,\s*0px\)/)
  assert.match(css, /z-index:\s*12000/)
  assert.match(css, /\.md-discover-ai-floats\s*>\s*\.ai-button\s*\{[^}]*width:\s*70px/)
  assert.match(css, /\.md-discover-ai-floats\s*>\s*\.ai-button\s*\{[^}]*height:\s*70px/)
  assert.doesNotMatch(
    css,
    /\.md-discover-ai-floats\s*>\s*\.ai-button\s*\{[^}]*var\(--md-safe-bottom\)/,
  )
})
