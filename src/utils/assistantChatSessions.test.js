import test from 'node:test'
import assert from 'node:assert/strict'
import {
  archiveAssistantChatSession,
  clearAssistantChatSessions,
  deleteAssistantChatSession,
  getAssistantChatSession,
  readAssistantChatSessions,
} from './assistantChatSessions.js'

const memory = new Map()

function mockLocalStorage() {
  globalThis.localStorage = {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null
    },
    setItem(key, value) {
      memory.set(String(key), String(value))
    },
    removeItem(key) {
      memory.delete(String(key))
    },
  }
}

test('archives chat on clear and restores from history list', () => {
  memory.clear()
  mockLocalStorage()

  const messages = [
    { id: 1, sender: 'bot', text: 'intro', isIntro: true },
    { id: 2, sender: 'user', text: 'сколько у меня на балансе' },
    { id: 3, sender: 'bot', text: 'На кошельке 3000 EUR' },
  ]

  const archived = archiveAssistantChatSession('user_7', messages, { purpose: null })
  assert.ok(archived?.id)
  assert.match(archived.title, /балансе/)

  const list = readAssistantChatSessions('user_7')
  assert.equal(list.length, 1)
  assert.equal(list[0].messageCount, 3)

  const loaded = getAssistantChatSession('user_7', archived.id)
  assert.equal(loaded.messages[1].text, 'сколько у меня на балансе')

  deleteAssistantChatSession('user_7', archived.id)
  assert.equal(readAssistantChatSessions('user_7').length, 0)

  clearAssistantChatSessions('user_7')
})

test('skips archive when there are no user messages', () => {
  memory.clear()
  mockLocalStorage()
  assert.equal(
    archiveAssistantChatSession('user_7', [{ id: 1, sender: 'bot', text: 'intro', isIntro: true }]),
    null,
  )
  assert.equal(readAssistantChatSessions('user_7').length, 0)
})
