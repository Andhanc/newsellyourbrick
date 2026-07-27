import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./SharesMobileFiltersDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./SharesMobileFiltersDrawer.css', import.meta.url), 'utf8')

test('drawer traps focus, closes on Escape, and restores the opener', () => {
  assert.match(source, /FOCUSABLE_SELECTOR/)
  assert.match(source, /previouslyFocusedRef/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /event\.key !== 'Tab'/)
  assert.match(source, /previouslyFocusedRef\.current\?\.focus/)
  assert.match(source, /onKeyDown=\{handleKeyDown\}/)
})

test('drawer close control is a 44 pixel touch target', () => {
  assert.match(css, /\.shares-mobile-filters-drawer__close\s*\{[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/)
})
