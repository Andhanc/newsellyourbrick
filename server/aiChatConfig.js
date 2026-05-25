/**
 * Конфигурация LLM для чата и генерации новостей.
 * По умолчанию — Pollinations (OpenAI-совместимый API, без ключа для тестов).
 * Опционально: OpenRouter, Groq, intelligence.io (legacy).
 */

export function normalizeApiKey(raw) {
  if (raw == null) return ''
  let s = String(raw).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  if (s.toLowerCase().startsWith('bearer ')) s = s.slice(7).trim()
  return s.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\s/g, '')
}

const PROVIDERS = {
  pollinations: {
    id: 'pollinations',
    url: 'https://text.pollinations.ai/openai',
    defaultModel: 'openai',
    keyEnv: ['POLLINATIONS_API_KEY', 'VITE_POLLINATIONS_API_KEY'],
    needsKey: false,
  },
  openrouter: {
    id: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openrouter/free',
    keyEnv: ['OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY'],
    needsKey: true,
    extraHeaders: {
      'HTTP-Referer': 'https://sellyourbrick.com',
      'X-Title': 'SellYourBrick',
    },
  },
  groq: {
    id: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    keyEnv: ['GROQ_API_KEY', 'VITE_GROQ_API_KEY'],
    needsKey: true,
  },
  intelligence: {
    id: 'intelligence',
    url: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
    defaultModel: 'deepseek-ai/DeepSeek-V3.2',
    keyEnv: ['INTELLIGENCE_IO_API_KEY', 'VITE_INTELLIGENCE_IO_API_KEY'],
    needsKey: true,
  },
}

function readKeyForProvider(provider) {
  for (const name of provider.keyEnv) {
    const v = normalizeApiKey(process.env[name])
    if (v) return v
  }
  return ''
}

function resolveProviderId() {
  const forced = String(process.env.AI_PROVIDER || '').trim().toLowerCase()
  if (forced && PROVIDERS[forced]) return forced

  if (readKeyForProvider(PROVIDERS.openrouter)) return 'openrouter'
  if (readKeyForProvider(PROVIDERS.groq)) return 'groq'
  if (readKeyForProvider(PROVIDERS.intelligence)) return 'intelligence'
  return 'pollinations'
}

/** @returns {{ id: string, url: string, apiKey: string, defaultModel: string, extraHeaders?: Record<string,string>, needsKey: boolean }} */
export function getActiveAiProvider() {
  const id = resolveProviderId()
  const provider = PROVIDERS[id]
  let apiKey = readKeyForProvider(provider)
  // Legacy text.pollinations.ai — только анонимные запросы; с Bearer часто 400.
  if (provider.id === 'pollinations' && process.env.POLLINATIONS_USE_LEGACY_KEY !== 'true') {
    apiKey = ''
  }
  return {
    id: provider.id,
    url: provider.url,
    apiKey,
    defaultModel: process.env.AI_CHAT_MODEL || provider.defaultModel,
    extraHeaders: provider.extraHeaders,
    needsKey: provider.needsKey,
  }
}

export function isAiConfigured() {
  const p = getActiveAiProvider()
  if (!p.needsKey) return true
  return Boolean(p.apiKey)
}

/** Подставляет модель провайдера, если в запросе legacy intelligence.io id */
export function normalizeChatPayload(body, provider) {
  const payload = { ...body }
  const requested = String(payload.model || '').trim()
  const legacyModels = /^deepseek-ai\//i.test(requested) || requested.includes('DeepSeek')
  if (!requested || legacyModels || provider.id !== 'intelligence') {
    if (!requested || legacyModels) {
      payload.model = provider.defaultModel
    }
  }

  if (provider.id === 'pollinations') {
    delete payload.reasoning_effort
    delete payload.tools
    delete payload.tool_choice
  }

  return payload
}

/** @deprecated используйте getActiveAiProvider */
export function getIntelligenceIoKeyFromEnv() {
  return readKeyForProvider(PROVIDERS.intelligence)
}
