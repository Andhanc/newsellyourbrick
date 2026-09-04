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
  openai: {
    id: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.6-terra',
    keyEnv: ['OPENAI_API_KEY'],
    needsKey: true,
  },
  pollinations: {
    id: 'pollinations',
    url: 'https://text.pollinations.ai/openai',
    // openai-fast — единственная anonymous-модель на legacy API (см. /models)
    defaultModel: 'openai-fast',
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

function materializeProvider(provider, modelOverride) {
  let apiKey = readKeyForProvider(provider)
  if (provider.id === 'pollinations' && process.env.POLLINATIONS_USE_LEGACY_KEY !== 'true') {
    apiKey = ''
  }
  return {
    id: provider.id,
    url: provider.url,
    apiKey,
    defaultModel: modelOverride || provider.defaultModel,
    extraHeaders: provider.extraHeaders,
    needsKey: provider.needsKey,
  }
}

function resolveProviderId() {
  const forced = String(process.env.AI_PROVIDER || '').trim().toLowerCase()
  if (forced && PROVIDERS[forced]) return forced

  if (readKeyForProvider(PROVIDERS.openai)) return 'openai'
  if (readKeyForProvider(PROVIDERS.openrouter)) return 'openrouter'
  if (readKeyForProvider(PROVIDERS.groq)) return 'groq'
  if (readKeyForProvider(PROVIDERS.intelligence)) return 'intelligence'
  return 'pollinations'
}

/** @returns {{ id: string, url: string, apiKey: string, defaultModel: string, extraHeaders?: Record<string,string>, needsKey: boolean }} */
export function getActiveAiProvider() {
  const id = resolveProviderId()
  const provider = PROVIDERS[id]
  return materializeProvider(provider, process.env.AI_CHAT_MODEL)
}

/** Умный помощник использует GPT-5.6 Terra напрямую или через OpenRouter. */
export function getAssistantAiProvider() {
  const directOpenAi = materializeProvider(PROVIDERS.openai, PROVIDERS.openai.defaultModel)
  if (directOpenAi.apiKey) return directOpenAi

  return materializeProvider(PROVIDERS.openrouter, 'openai/gpt-5.6-terra')
}

export function isAssistantAiConfigured() {
  return Boolean(getAssistantAiProvider().apiKey)
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
  const openAiOnlyModel = /^gpt-5\.6-(?:sol|terra|luna)$/i.test(requested)
  if (!requested || legacyModels || (openAiOnlyModel && provider.id !== 'openai')) {
    payload.model = provider.defaultModel
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
