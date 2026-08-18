import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const util = await readFile(new URL('./whatsappManagerChat.js', import.meta.url), 'utf8')
const page = await readFile(new URL('../pages/TestPage.jsx', import.meta.url), 'utf8')
const server = await readFile(new URL('../../server/server.js', import.meta.url), 'utf8')

test('cabinet personal manager opens WhatsApp chat from admin session', () => {
  assert.match(util, /whatsapp\/manager-chat/)
  assert.match(util, /https:\/\/wa\.me\//)
  assert.match(page, /fetchWhatsAppManagerChatUrl/)
  assert.match(page, /openWhatsAppManagerChat/)
  assert.match(server, /app\.get\('\/api\/whatsapp\/manager-chat'/)
  assert.match(server, /getWhatsAppManagerDigits/)
})
