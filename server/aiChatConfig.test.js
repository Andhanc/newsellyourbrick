import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssistantAiProvider, normalizeChatPayload } from './aiChatConfig.js'

test('GPT-5.6 Terra is preserved for OpenAI and safely remapped for fallback providers', () => {
  const request = { model: 'gpt-5.6-terra', messages: [] }
  assert.equal(
    normalizeChatPayload(request, { id: 'openai', defaultModel: 'gpt-5.6-terra' }).model,
    'gpt-5.6-terra',
  )
  assert.equal(
    normalizeChatPayload(request, { id: 'pollinations', defaultModel: 'openai-fast' }).model,
    'openai-fast',
  )
  assert.equal(
    normalizeChatPayload(request, { id: 'openrouter', defaultModel: 'openai/gpt-5.6-terra' }).model,
    'openai/gpt-5.6-terra',
  )
})

test('assistant provider is pinned to OpenAI GPT-5.6 Terra', () => {
  const previousKey = process.env.OPENAI_API_KEY
  const previousRouterKey = process.env.OPENROUTER_API_KEY
  process.env.OPENAI_API_KEY = 'test-key'
  try {
    const provider = getAssistantAiProvider()
    assert.equal(provider.id, 'openai')
    assert.equal(provider.defaultModel, 'gpt-5.6-terra')
    assert.equal(provider.apiKey, 'test-key')
  } finally {
    if (previousKey == null) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previousKey
    if (previousRouterKey == null) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousRouterKey
  }
})

test('assistant uses the same Terra model through OpenRouter when no direct OpenAI key exists', () => {
  const previousKey = process.env.OPENAI_API_KEY
  const previousRouterKey = process.env.OPENROUTER_API_KEY
  delete process.env.OPENAI_API_KEY
  process.env.OPENROUTER_API_KEY = 'router-test-key'
  try {
    const provider = getAssistantAiProvider()
    assert.equal(provider.id, 'openrouter')
    assert.equal(provider.defaultModel, 'openai/gpt-5.6-terra')
    assert.equal(provider.apiKey, 'router-test-key')
  } finally {
    if (previousKey == null) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previousKey
    if (previousRouterKey == null) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = previousRouterKey
  }
})
