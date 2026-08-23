import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('main page uses the shared auction AI FAB instead of the grid menu', () => {
  assert.match(page, /<SiteChatDock wrapperClassName="md-discover-ai-floats">/)
  assert.doesNotMatch(page, /md-fab|FiGrid/)
  assert.match(css, /\.md-discover-ai-floats > \.ai-button/)
  assert.doesNotMatch(css, /\.md-fab/)
})
