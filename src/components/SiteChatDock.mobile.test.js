import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dock = await readFile(new URL('./SiteChatDock.jsx', import.meta.url), 'utf8')
const modal = await readFile(new URL('./ManagerChatModal.jsx', import.meta.url), 'utf8')
const managerHost = await readFile(new URL('./GlobalManagerChatHost.jsx', import.meta.url), 'utf8')
const aiHost = await readFile(new URL('./GlobalAiChatHost.jsx', import.meta.url), 'utf8')
const aiModal = await readFile(new URL('./AiChatModal.jsx', import.meta.url), 'utf8')
const aiPanel = await readFile(new URL('./AiChatPanel.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./SiteChatDock.css', import.meta.url), 'utf8')
const hook = await readFile(new URL('../hooks/useSiteAiChatDock.js', import.meta.url), 'utf8')

test('manager chat is hosted globally (modal desktop / drawer mobile)', () => {
  assert.match(managerHost, /GlobalManagerChatHost/)
  assert.match(managerHost, /openManagerChat/)
  assert.match(modal, /useMobileLayout\(767\)/)
  assert.match(modal, /BuyerSheetShell/)
  assert.match(modal, /manager-chat-modal-root/)
  assert.match(modal, /chat-widget--sheet-drawer chat-widget--manager-drawer/)
})

test('AI chat header can clear conversation history', () => {
  assert.match(aiPanel, /clearChatHistory/)
  assert.match(aiPanel, /clearChat/)
  assert.match(aiPanel, /FiTrash2/)
  assert.match(hook, /function clearChatHistory|const clearChatHistory/)
  assert.match(hook, /aiChatHistory_/)
  assert.match(hook, /aiChatPreferences_/)
})

test('AI chat is hosted globally (modal desktop / drawer mobile)', () => {
  assert.match(aiHost, /GlobalAiChatHost/)
  assert.match(aiHost, /configureAIChatHost/)
  assert.match(aiModal, /useMobileLayout\(767\)/)
  assert.match(aiModal, /BuyerSheetShell/)
  assert.match(aiModal, /manager-chat-modal-root ai-chat-modal-root/)
  assert.match(aiPanel, /chat-widget--sheet-drawer chat-widget--manager-drawer/)
  assert.match(css, /\.site-ai-drawer \.chat-widget--sheet-drawer/)
})

test('SiteChatDock is FAB-only and dispatches openAIChat', () => {
  assert.match(dock, /openAIChat/)
  assert.match(dock, /closeAIChat/)
  assert.doesNotMatch(dock, /BuyerSheetShell/)
  assert.doesNotMatch(dock, /chat-widget--sheet-drawer/)
})
