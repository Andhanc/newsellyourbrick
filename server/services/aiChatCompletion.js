import {
  getActiveAiProvider,
  isAiConfigured,
  normalizeChatPayload,
} from '../aiChatConfig.js'

/**
 * OpenAI-совместимый chat/completions (серверный вызов).
 * @param {object} body — { model, messages, temperature, max_tokens, ... }
 */
export async function postChatCompletions(body, init = {}) {
  const provider = init.provider || getActiveAiProvider()
  if (provider.needsKey && !provider.apiKey) {
    throw new Error(
      `AI key is not set for provider “${provider.id}”. Set the key in .env or use AI_PROVIDER=pollinations (no key).`,
    )
  }

  const payload = normalizeChatPayload(body, provider)
  const headers = {
    'Content-Type': 'application/json',
    ...(provider.extraHeaders || {}),
  }
  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`
  }

  const timeoutMs = Number(init.timeoutMs) > 0 ? Number(init.timeoutMs) : 180000

  const res = await fetch(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: init.signal || AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const errText = await res.text()
    let friendly = `AI error (${provider.id}), status ${res.status}`
    try {
      const parsed = JSON.parse(errText)
      if (parsed?.deprecation_notice && provider.id === 'pollinations') {
        friendly =
          'Pollinations: invalid request parameters. Restart the server after updating. If POLLINATIONS_API_KEY is set in .env, remove it for free mode.'
      } else if (parsed?.error) {
        if (typeof parsed.error === 'string') {
          friendly = parsed.error
        } else {
          const rawProviderError = parsed.error?.metadata?.raw
          let providerDetail = ''
          if (typeof rawProviderError === 'string' && rawProviderError.trim()) {
            try {
              const rawParsed = JSON.parse(rawProviderError)
              providerDetail = String(rawParsed?.error?.message || rawParsed?.message || '').trim()
            } catch {
              providerDetail = rawProviderError.trim()
            }
          }
          const message = String(parsed.error.message || parsed.error.code || friendly)
          friendly = providerDetail && providerDetail !== message
            ? `${message}: ${providerDetail.slice(0, 500)}`
            : message
        }
      }
    } catch {
      if (/reasoning_effort|validation error/i.test(errText)) {
        friendly = 'Unsupported AI request parameter. Update the server and try again.'
      }
    }
    throw new Error(friendly)
  }

  return res.json()
}

export function getAiProviderStatus() {
  const p = getActiveAiProvider()
  return {
    provider: p.id,
    model: p.defaultModel,
    configured: isAiConfigured(),
    keyless: !p.needsKey,
  }
}
