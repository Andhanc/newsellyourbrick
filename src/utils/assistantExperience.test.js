import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSISTANT_CACHE_TTL_MS,
  createAssistantCacheEnvelope,
  detectAssistantInputLanguage,
  readAssistantCache,
} from './assistantExperience.js'

test('assistant cache expires and never persists attachment payloads', () => {
  const now = 1_800_000_000_000
  const envelope = createAssistantCacheEnvelope([{
    sender: 'user',
    text: 'test',
    attachments: [{ name: 'a.txt', mimeType: 'text/plain', size: 4, dataUrl: 'secret' }],
  }], now)

  assert.equal(envelope.messages[0].attachments[0].dataUrl, undefined)
  assert.equal(readAssistantCache(envelope, now + 1000).length, 1)
  assert.deepEqual(readAssistantCache(envelope, now + ASSISTANT_CACHE_TTL_MS + 1), [])
  assert.deepEqual(readAssistantCache('{broken json'), [])
})

test('assistant language detection covers every supported locale family', () => {
  assert.equal(detectAssistantInputLanguage('Здравствуйте'), 'ru')
  assert.equal(detectAssistantInputLanguage('Hello there'), 'en')
  assert.equal(detectAssistantInputLanguage('¿Cómo comprar una propiedad?'), 'es')
  assert.equal(detectAssistantInputLanguage('Hallo, eine Wohnung'), 'de')
  assert.equal(detectAssistantInputLanguage('Bonjour, un logement'), 'fr')
  assert.equal(detectAssistantInputLanguage('Cześć, mieszkanie'), 'pl')
  assert.equal(detectAssistantInputLanguage('Hej, en bostad'), 'sv')
})
