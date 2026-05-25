/**
 * Прокси chat/completions для фронта (умный помощник, генерация описаний).
 * По умолчанию — Pollinations без API-ключа; можно переключить через .env.
 */
import express from 'express'
import { getActiveAiProvider, isAiConfigured, normalizeChatPayload } from './aiChatConfig.js'

export { getIntelligenceIoKeyFromEnv } from './aiChatConfig.js'

/** @param {import('express').Express} app */
export function registerIntelligenceIoProxy(app) {
  app.post('/api/ai/intelligence-chat', express.json({ limit: '4mb' }), async (req, res) => {
    const provider = getActiveAiProvider()

    if (!isAiConfigured()) {
      return res.status(503).json({
        detail: `AI provider "${provider.id}" requires an API key. Set OPENROUTER_API_KEY, GROQ_API_KEY, or AI_PROVIDER=pollinations for free testing without a key.`,
      })
    }

    try {
      const payload = normalizeChatPayload(req.body, provider)
      const headers = {
        'Content-Type': 'application/json',
        ...(provider.extraHeaders || {}),
      }
      if (provider.apiKey) {
        headers.Authorization = `Bearer ${provider.apiKey}`
      }

      const upstream = await fetch(provider.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const text = await upstream.text()
      if (!upstream.ok) {
        let message = text.slice(0, 500)
        try {
          const parsed = JSON.parse(text)
          if (parsed?.deprecation_notice) {
            message =
              'Ошибка Pollinations API. Уберите POLLINATIONS_API_KEY из .env (для тестов ключ не нужен) и перезапустите npm start.'
          } else if (parsed?.error) {
            message = String(parsed.error)
          }
        } catch {
          /* raw text */
        }
        return res.status(upstream.status).json({ detail: message })
      }
      const ct = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
      res.status(upstream.status).setHeader('Content-Type', ct).send(text)
    } catch (err) {
      console.error('[api/ai/intelligence-chat]', err)
      res.status(502).json({ detail: String(err?.message || err) })
    }
  })

  app.get('/api/ai/status', (_req, res) => {
    const p = getActiveAiProvider()
    res.json({
      provider: p.id,
      model: p.defaultModel,
      configured: isAiConfigured(),
      keyless: !p.needsKey,
    })
  })
}
