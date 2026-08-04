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
  const provider = getActiveAiProvider()
  if (!isAiConfigured()) {
    throw new Error(
      `Ключ AI не задан для провайдера «${provider.id}». Укажите ключ в .env или используйте AI_PROVIDER=pollinations (без ключа).`,
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
    let friendly = `Ошибка AI (${provider.id}), код ${res.status}`
    try {
      const parsed = JSON.parse(errText)
      if (parsed?.deprecation_notice && provider.id === 'pollinations') {
        friendly =
          'Pollinations: неверные параметры запроса. Перезапустите сервер после обновления. Если в .env есть POLLINATIONS_API_KEY — удалите его для бесплатного режима.'
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
        friendly = 'Неподдерживаемый параметр запроса к AI. Обновите сервер и повторите.'
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
