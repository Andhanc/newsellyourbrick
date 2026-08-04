import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./SiteChatDock.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./SiteChatDock.css', import.meta.url), 'utf8')

test('manager chat uses the buyer drawer on phone layouts', () => {
  assert.match(source, /useMobileLayout\(767\)/)
  assert.match(source, /isOpen=\{chat\.isManagerChatOpen\}/)
  assert.match(source, /className="site-ai-drawer site-manager-drawer"/)
  assert.match(source, /renderManagerChat\(true\)/)
})

test('manager and AI drawers share the full-height chat layout', () => {
  assert.match(source, /chat-widget--sheet-drawer chat-widget--manager-drawer/)
  assert.match(source, /chat-widget--sheet-drawer chat-widget--ai-drawer/)
  assert.match(css, /\.site-ai-drawer \.chat-widget--sheet-drawer/)
})
