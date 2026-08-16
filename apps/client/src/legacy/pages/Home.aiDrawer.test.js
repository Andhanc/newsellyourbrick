import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../pages/Home.jsx', import.meta.url), 'utf8')

test('auction Home opens AI chat via SiteChatDock drawer', () => {
  assert.match(source, /SiteChatDockLazy/)
  assert.match(source, /import\('\.\.\/components\/SiteChatDock'\)/)
  assert.match(source, /wrapperClassName="home-auction-floats"/)
  assert.match(source, /configureAIChatHost/)
  assert.doesNotMatch(source, /className="chat-widget"/)
  assert.doesNotMatch(source, /toggleChat/)
})
