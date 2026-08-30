import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')
const homeCss = await readFile(new URL('./Home.css', import.meta.url), 'utf8')

test('home discover page hosts the same AI plaque as auction', () => {
  assert.match(page, /SiteChatDock/)
  assert.match(page, /wrapperClassName="md-discover-ai-floats"/)
})

test('home AI plaque reuses shared Home.css sizing without local overrides', () => {
  assert.match(css, /\.md-discover-ai-floats\s*\{/)
  assert.doesNotMatch(css, /\.md-discover-ai-floats\s*>\s*\.ai-button\s*\{/)
  assert.match(homeCss, /\.ai-button\s*\{[^}]*--ai-fab-size:\s*56px/)
  assert.match(homeCss, /--ai-fab-bottom:\s*calc\(90px \+ env\(safe-area-inset-bottom/)
})
